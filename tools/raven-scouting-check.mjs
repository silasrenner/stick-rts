import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';
import { buyRaven, getPurchaseFeasibility } from '../src/sim/systems/economy.js';
import { runTick } from '../src/sim/tick.js';
import { getVisibleEnemyEntities, isEntityVisibleToTeam, isPositionVisibleToTeam } from '../src/sim/vision.js';
import { getBuildButtonDisabledReason, getBuildMenuButtons } from '../src/render/ui.js';
import { createStructure, createUnit, createWorld } from '../src/sim/world.js';

const DT = 1 / CONFIG.TICK_HZ;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function makeWorld(seed = 301) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.units = [];
  world.structures = [];
  return world;
}

function tickFor(world, seconds) {
  const ticks = Math.round(seconds * CONFIG.TICK_HZ);
  for (let i = 0; i < ticks; i++) runTick(world, DT);
}

function tickUntil(world, predicate, maxSeconds = 30) {
  for (let i = 0; i < Math.ceil(maxSeconds * CONFIG.TICK_HZ); i++) {
    runTick(world, DT);
    if (predicate()) return;
  }
  throw new Error('Timed out waiting for deterministic Raven lifecycle state.');
}

function ravenSource(world, team, type) {
  return world.visionSources.find((source) => source.team === team && source.ravenSource === type) ?? null;
}

// Economy / separation contract: Raven spends ordinary gold, never occupies
// normal FIFO/cap/unit state, and cannot be re-purchased while active/cooling.
{
  const world = makeWorld();
  const team = world.teams.player;
  team.gold = CONFIG.RAVEN.cost;
  const result = buyRaven(world, 'player');
  expect(result.ok, 'Affordable Raven purchase must succeed.');
  expect(team.gold === 0 && team.goldSpent === CONFIG.RAVEN.cost, 'Raven purchase must use ordinary gold spending exactly once.');
  expect(world.ravens.length === 1 && world.ravens[0].state === 'preparing', 'Successful Raven purchase must create a preparing lifecycle record.');
  expect(team.productionQueue.length === 0, 'Raven must not enter the normal production queue.');
  expect(world.units.length === 0, 'Raven must not materialize as a combat/world unit.');
  expect(getPurchaseFeasibility(world, 'player', { action: 'raven' }).reason === 'ravenActive', 'Active/preparing Raven must prevent an immediate repeat purchase.');
  expect(buyRaven(world, 'player').reason === 'ravenActive', 'Immediate Raven repurchase must fail without a subsidy.');
}

{
  const world = makeWorld();
  world.teams.player.gold = CONFIG.RAVEN.cost - 1;
  const before = world.teams.player.gold;
  expect(buyRaven(world, 'player').reason === 'gold', 'Unaffordable Raven purchase must fail with normal gold legality.');
  expect(world.teams.player.gold === before && world.ravens.length === 0, 'Failed Raven purchase must not change economy or world state.');
}

// Direction, preparation, moving vision, base reveal, exact expiry, clean exit,
// and cooldown are tested on the same deterministic player-side tracer.
{
  const world = makeWorld(302);
  world.teams.player.gold = CONFIG.RAVEN.cost;
  expect(buyRaven(world, 'player').ok, 'Player Raven tracer must purchase.');
  const raven = world.ravens[0];
  const startX = raven.x;
  tickFor(world, CONFIG.RAVEN.preparationTime);
  expect(raven.state === 'flying', 'Raven must leave preparation deterministically.');
  tickFor(world, 1);
  expect(raven.x > startX, 'Left/player Raven must fly right toward the Right base.');
  expect(ravenSource(world, 'player', 'moving'), 'Flying Raven must project a generic moving vision source.');

  const hidden = createUnit('warrior', 'ai', raven.x + CONFIG.RAVEN.movingVisionRadius + 10, raven.y);
  const revealed = createUnit('warrior', 'ai', raven.x, raven.y);
  world.units.push(hidden, revealed);
  expect(!isEntityVisibleToTeam(world, 'player', hidden), 'Enemy outside Raven moving vision must remain hidden.');
  expect(isEntityVisibleToTeam(world, 'player', revealed), 'Enemy entering Raven moving vision must become visible.');

  tickUntil(world, () => raven.state === 'revealing');
  expect(raven.state === 'revealing', 'Raven must activate reveal at the opposing base.');
  const reveal = ravenSource(world, 'player', 'reveal');
  expect(reveal && reveal.x === CONFIG.AI_HOME_X && reveal.radius === CONFIG.RAVEN.enemyBaseRevealRadius, 'Base reveal must use the configured generic source centered on the enemy base.');
  const baseEnemy = createUnit('archer', 'ai', CONFIG.AI_HOME_X - CONFIG.RAVEN.enemyBaseRevealRadius + CONFIG.RAVEN.flightAltitude + 1, CONFIG.GROUND_Y);
  world.units.push(baseEnemy);
  expect(getVisibleEnemyEntities(world, 'player').some((entry) => entry.id === baseEnemy.id), 'Enemy-base reveal must expose enemies inside its configured radius.');

  tickFor(world, CONFIG.RAVEN.revealDuration - DT);
  expect(ravenSource(world, 'player', 'reveal'), 'Base reveal must remain active before its exact simulated duration elapses.');
  tickFor(world, DT);
  expect(!ravenSource(world, 'player', 'reveal') && raven.state === 'exiting', 'Base reveal must expire exactly at the configured duration and begin exiting.');
  tickFor(world, CONFIG.RAVEN.exitDistance / CONFIG.RAVEN.exitSpeed + DT * 2);
  expect(world.ravens.length === 0 && !world.visionSources.some((source) => source.ravenId === raven.id), 'Exiting Raven must despawn and remove all temporary vision descriptors.');
  expect(getPurchaseFeasibility(world, 'player', { action: 'raven' }).reason === 'ravenCooldown', 'Cooldown must prevent a new Raven after the lifecycle has exited.');
}

// Right/AI Raven must mirror direction, and Raven has no cap/combat/frontline
// contribution because it never enters world.units.
{
  const world = makeWorld(303);
  world.teams.ai.gold = CONFIG.RAVEN.cost;
  expect(buyRaven(world, 'ai').ok, 'Right/AI Raven tracer must purchase.');
  const raven = world.ravens[0];
  const startX = raven.x;
  tickFor(world, CONFIG.RAVEN.preparationTime + 1);
  expect(raven.x < startX, 'Right/AI Raven must fly left toward the Left base.');
  const assessment = buildAiAssessment(world, 'ai');
  expect(assessment.population.units === 0 && assessment.combatUnits === 0, 'Raven must not consume population or count as combat units.');
  expect(assessment.frontline.friendlyCombatCount === 0 && assessment.frontline.friendlyPower === 0, 'Raven must not contribute frontline combat strength.');
}

// A Raven reveal must refresh the normal shared AI observation/memory path;
// after reveal expiry, mobile memory ages normally while structures persist.
{
  const world = makeWorld(304);
  world.teams.player.gold = CONFIG.RAVEN.cost;
  const mobile = createUnit('warrior', 'ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y);
  const structure = createStructure('ai', CONFIG.AI_HOME_X + 10, CONFIG.GROUND_Y);
  world.units.push(mobile);
  world.structures.push(structure);
  expect(buyRaven(world, 'player').ok, 'Memory tracer Raven must purchase.');
  tickUntil(world, () => world.ravens[0]?.state === 'revealing');
  expect(isPositionVisibleToTeam(world, 'player', CONFIG.AI_HOME_X), 'Raven reveal must feed the ordinary team visibility query.');
  updateAiMemory(world, 'player', 20);
  expect(world.aiMemory.player.currentlyVisibleEnemies.some((entry) => entry.id === mobile.id), 'Raven-visible mobile enemy must enter normal current AI observations.');
  expect(world.aiMemory.player.rememberedEnemyStructures.some((entry) => entry.id === structure.id), 'Raven-visible structure must enter normal persistent structure memory.');
  tickFor(world, CONFIG.RAVEN.revealDuration + DT);
  mobile.x = CONFIG.WORLD_WIDTH / 2;
  updateAiMemory(world, 'player', 20);
  expect(world.aiMemory.player.rememberedEnemyUnits.some((entry) => entry.id === mobile.id), 'After reveal expiry, mobile Raven observation must follow normal bounded memory.');
  world.matchElapsedTime += 20 + DT;
  updateAiMemory(world, 'player', 20);
  expect(!world.aiMemory.player.rememberedEnemyUnits.some((entry) => entry.id === mobile.id), 'Raven-revealed mobile memory must expire normally.');
  expect(world.aiMemory.player.rememberedEnemyStructures.some((entry) => entry.id === structure.id), 'Raven-revealed structures must retain existing persistent structure-memory behavior.');
}

// Independent equal-seed Raven scenarios must yield identical normalized state.
{
  function scenario() {
    const world = makeWorld(305);
    world.teams.player.gold = CONFIG.RAVEN.cost;
    buyRaven(world, 'player');
    tickFor(world, CONFIG.RAVEN.preparationTime + 3);
    return JSON.stringify({
      time: world.matchElapsedTime,
      ravens: world.ravens.map(({ id, ...raven }) => raven),
      sources: world.visionSources.map(({ ravenId, ...source }) => source),
      gold: world.teams.player.gold,
      cooldown: world.teams.player.ravenCooldownTimer,
    });
  }
  expect(scenario() === scenario(), 'Repeated identical-seed Raven scenarios must be deterministic.');
}

// Player UI exposes a compact Raven action with availability/affordability and
// cooldown state, without presenting it as a normal queued unit.
{
  const world = makeWorld(306);
  const ravenButton = getBuildMenuButtons({ width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT })
    .find((button) => button.action === 'raven');
  expect(ravenButton?.label === 'Raven', 'Build UI must expose a Raven purchase control.');
  world.teams.player.gold = CONFIG.RAVEN.cost - 1;
  expect(getBuildButtonDisabledReason(world, ravenButton) === 'gold', 'Unaffordable Raven UI must show ordinary gold legality.');
  world.teams.player.gold = CONFIG.RAVEN.cost;
  expect(getBuildButtonDisabledReason(world, ravenButton) === null, 'Affordable available Raven UI must be enabled.');
  buyRaven(world, 'player');
  expect(getBuildButtonDisabledReason(world, ravenButton) === 'ravenActive', 'Active Raven UI must expose its lifecycle unavailability.');
}

console.log('PASS — Raven economy, lifecycle, generic vision, perception/memory, isolation, expiry, cleanup, UI, and determinism contracts hold.');
