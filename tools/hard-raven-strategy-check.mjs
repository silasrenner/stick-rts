import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const TEAM = 'ai';
const DT = 1 / CONFIG.TICK_HZ;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function prepareStaleHardWorld(seed) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.matchElapsedTime = 240;
  world.teams[TEAM].difficulty = 'hard';
  world.teams[TEAM].decisionTimer = 0;
  world.teams[TEAM].gold = 10_000;
  world.units = [
    createUnit('miner', TEAM, CONFIG.AI_HOME_X, CONFIG.GROUND_Y),
    ...Array.from({ length: 13 }, (_, index) => createUnit('warrior', TEAM, CONFIG.AI_HOME_X - 100 - index * 8, CONFIG.GROUND_Y)),
  ];
  world.aiMemory[TEAM] = {
    currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {},
    lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0,
  };
  return world;
}

function decide(world) {
  world.teams[TEAM].decisionTimer = 0;
  updateAiDecisions(world, DT);
  return world.teams[TEAM].lastAiDecision;
}

function ravenCandidate(record) {
  return record.candidates.find(({ candidate }) => candidate.action === 'raven');
}

// The first wealthy stale-information decision can still scout, but it must
// record an investment comparison rather than treating the Raven as a routine
// cooldown purchase.
{
  const world = prepareStaleHardWorld(1501);
  const record = decide(world);
  const raven = ravenCandidate(record);
  expect(raven.utility?.intervalEligible === true, `First Raven opportunity must expose an eligible strategic interval: ${JSON.stringify(raven)}.`);
  expect(raven.utility?.protectedCombatReserve >= CONFIG.UNIT_STATS.warrior.cost * CONFIG.HARD_RAVEN_RESERVE_COMBAT_UNITS, 'Raven must protect the configured combat reserve before spending 1200g on information.');
  expect(record.selection.candidate?.action === 'raven', `A wealthy, stale, first opportunity should retain one legal Raven purchase: ${JSON.stringify(record.selection)}.`);
}

// Once the reveal/cooldown is gone but the strategic interval has not elapsed,
// the normal unit selector must win even if stale information still exists.
{
  const world = prepareStaleHardWorld(1502);
  const first = decide(world);
  expect(first.selection.candidate?.action === 'raven', 'Fixture must establish the first Raven purchase.');
  world.ravens = [];
  world.teams[TEAM].ravenCooldownTimer = 0;
  world.matchElapsedTime += CONFIG.RAVEN.cooldown + 1;
  const second = decide(world);
  const raven = ravenCandidate(second);
  expect(raven.utility?.intervalEligible === false, `Repeat Raven must be interval-blocked in its decision record: ${JSON.stringify(raven)}.`);
  expect(second.selection.candidate?.action !== 'raven', `Repeat stale-information decision must preserve normal production: ${JSON.stringify(second.selection)}.`);
}

console.log('PASS — Hard Raven purchases preserve a combat reserve and cannot repeat before the configured strategic interval.');
