import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';
import { runTick } from '../src/sim/tick.js';
import { createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function add(world, team, kind, x) {
  const unit = createUnit(kind, team, x, CONFIG.GROUND_Y);
  world.units.push(unit);
  return unit;
}

function assessmentFor(team, setup) {
  const world = createWorld(401);
  setup(world, team);
  updateAiMemory(world, team, DIFFICULTIES.hard.memoryStaleness);
  return { world, assessment: buildAiAssessment(world, team, DIFFICULTIES.hard) };
}

function mirrorX(x) {
  return CONFIG.WORLD_WIDTH - x;
}

// Mirrored fronts produce identical counts, power, normalized progress, and
// mirrored forward positions. The facing team changes, not the assessment rule.
{
  const left = assessmentFor('player', (world) => {
    add(world, 'player', 'warrior', 1100);
    add(world, 'player', 'archer', 1050);
    add(world, 'player', 'warrior', 400);
    add(world, 'ai', 'warrior', 1120);
  }).assessment;
  const right = assessmentFor('ai', (world) => {
    add(world, 'ai', 'warrior', mirrorX(1100));
    add(world, 'ai', 'archer', mirrorX(1050));
    add(world, 'ai', 'warrior', mirrorX(400));
    add(world, 'player', 'warrior', mirrorX(1120));
  }).assessment;
  expect(left.frontline.friendlyCombatCount === right.frontline.friendlyCombatCount, 'Mirrored teams must have equal frontline friendly counts.');
  expect(left.frontline.friendlyPower === right.frontline.friendlyPower, 'Mirrored teams must have equal frontline friendly power.');
  expect(left.frontline.visibleEnemyCombatCount === right.frontline.visibleEnemyCombatCount, 'Mirrored teams must have equal visible frontline enemy counts.');
  expect(left.frontline.visibleEnemyPower === right.frontline.visibleEnemyPower, 'Mirrored teams must have equal visible frontline enemy power.');
  expect(left.objective.progress === right.objective.progress, 'Mirrored teams must have equal normalized objective progress.');
  expect(left.objective.forwardMostFriendlyCombatX === mirrorX(right.objective.forwardMostFriendlyCombatX), 'Forward positions must mirror across Left/Right teams.');
}

// The active front is the fixed depth behind the forward-most friendly fighter.
{
  const { world, assessment } = assessmentFor('player', (fixture) => {
    add(fixture, 'player', 'warrior', 1500);
    add(fixture, 'player', 'archer', 1500 - CONFIG.FRONTLINE_COMBAT_DEPTH);
    add(fixture, 'player', 'warrior', 1500 - CONFIG.FRONTLINE_COMBAT_DEPTH - 1);
  });
  expect(assessment.frontline.friendlyCombatCount === 2, 'Only combat units inside the fixed forward band must count as frontline mass.');
  world.units[2].x = 1490;
  const entered = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  expect(entered.frontline.friendlyCombatCount === 3, 'A combat unit entering the forward band must count as frontline mass.');
}

// Local enemy force is exclusively current shared-team visibility; remembered
// snapshots cannot create a current enemy frontline contact.
{
  const { world, assessment } = assessmentFor('player', (fixture) => {
    add(fixture, 'player', 'warrior', 1600);
    add(fixture, 'ai', 'warrior', 1620);
  });
  expect(assessment.frontline.visibleEnemyCombatCount === 1, 'Visible enemy combat at the front must contribute to local enemy strength.');
  const enemy = world.units.find((unit) => unit.team === 'ai');
  world.matchElapsedTime = 1;
  enemy.x = 3000;
  updateAiMemory(world, 'player', DIFFICULTIES.hard.memoryStaleness);
  const hidden = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  expect(hidden.enemyMemory.rememberedEnemies.some((entry) => entry.id === enemy.id && entry.x === 1620), 'Fixture must retain a frozen hidden enemy memory.');
  expect(hidden.frontline.visibleEnemyCombatCount === 0 && hidden.frontline.visibleEnemyPower === 0, 'Remembered hidden enemies must not masquerade as current frontline contact.');
}

// The objective measure uses the forward-most friendly combat unit, moving from
// 0 at own home to 1 at the enemy home; it is not driven by enemy live state.
{
  const { world } = assessmentFor('player', (fixture) => add(fixture, 'player', 'warrior', CONFIG.PLAYER_HOME_X));
  const home = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  world.units[0].x = (CONFIG.PLAYER_HOME_X + CONFIG.AI_HOME_X) / 2;
  const middle = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  world.units[0].x = CONFIG.AI_HOME_X;
  const objective = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  expect(home.objective.progress === 0 && middle.objective.progress > home.objective.progress && objective.objective.progress === 1, 'Forward movement must increase objective progress toward the enemy objective.');
  expect(objective.objective.distanceRemaining === 0 && middle.objective.distanceRemaining > objective.objective.distanceRemaining, 'Distance remaining must shrink toward the enemy objective.');
  world.units[0].x = CONFIG.PLAYER_HOME_X + 200;
  const homeward = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  expect(homeward.objective.progress < middle.objective.progress, 'Homeward movement must decrease objective progress.');
}

// No combat is explicit, neutral, and finite rather than an invalid numeric value.
{
  const { assessment } = assessmentFor('ai', (world) => add(world, 'ai', 'miner', CONFIG.AI_HOME_X));
  expect(assessment.frontline.friendlyCombatCount === 0 && assessment.frontline.friendlyPower === 0, 'No-combat assessment must report zero friendly frontline strength.');
  expect(assessment.frontline.visibleEnemyCombatCount === 0 && assessment.frontline.visibleEnemyPower === 0, 'No-combat assessment must report zero visible enemy frontline strength.');
  expect(assessment.objective.forwardMostFriendlyCombatX === null && assessment.objective.distanceRemaining === null && assessment.objective.progress === 0, 'No-combat objective assessment must be empty with neutral progress.');
}

// Assessment is read-only and deterministic: it cannot consume RNG or change
// world state, and identical full simulations remain byte-for-byte equivalent.
{
  const world = createWorld(499);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard';
  world.teams.ai.difficulty = 'hard';
  const before = JSON.stringify(world);
  const one = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  const two = buildAiAssessment(world, 'player', DIFFICULTIES.hard);
  expect(JSON.stringify(one) === JSON.stringify(two), 'Identical world state must produce identical assessment output.');
  expect(JSON.stringify(world) === before, 'Assessment must not mutate match state or RNG state.');

  function run(seed) {
    const simulated = createWorld(seed);
    simulated.matchState = 'playing';
    simulated.teams.player.difficulty = 'hard';
    simulated.teams.ai.difficulty = 'hard';
    for (let tick = 0; tick < 3600 && simulated.matchState === 'playing'; tick += 1) runTick(simulated, 1 / CONFIG.TICK_HZ);
    return JSON.stringify({
      matchState: simulated.matchState,
      elapsed: simulated.matchElapsedTime,
      teams: Object.fromEntries(Object.entries(simulated.teams).map(([team, state]) => [team, {
        gold: state.gold, command: state.command, recovering: state.recovering, buildIndex: state.buildIndex,
        strategicGoal: state.strategicGoal, queue: state.productionQueue,
      }])),
      units: simulated.units.map(({ team, kind, x, y, hp, state }) => ({ team, kind, x, y, hp, state })),
      structures: simulated.structures.map(({ team, x, hp, state }) => ({ team, x, hp, state })),
    });
  }
  expect(run(500) === run(500), 'Observation-only frontline fields must preserve same-seed deterministic simulation output.');
}

console.log('PASS — Hard frontline/objective assessment is symmetric, visibility-bounded, deterministic, and observation-only.');
