import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { getRavenUtility } from '../src/sim/ai/scouting.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';
import { buyRaven } from '../src/sim/systems/economy.js';
import { runTick } from '../src/sim/tick.js';
import { createStructure, createUnit, createWorld } from '../src/sim/world.js';

const TEAM = 'ai';
const DT = 1 / CONFIG.TICK_HZ;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function worldForHard(seed = 901) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams[TEAM].difficulty = 'hard';
  world.teams[TEAM].decisionTimer = 0;
  world.teams[TEAM].heroCooldownTimer = 10_000;
  world.units = [];
  world.structures = [];
  return world;
}

function add(world, kind, team, count, x) {
  for (let i = 0; i < count; i++) world.units.push(createUnit(kind, team, x + i * 8, CONFIG.GROUND_Y));
}

function decide(world) {
  world.teams[TEAM].decisionTimer = 0;
  updateAiDecisions(world, DT);
  return world.teams[TEAM].lastAiDecision;
}

function candidate(record, action, kind = null) {
  return record.candidates.find((entry) => entry.candidate.action === action && entry.candidate.kind === kind);
}

// Current meaningful contact is fresh/covered and Raven stays a low-utility
// candidate even with ample gold.
{
  const world = worldForHard(901);
  world.teams[TEAM].gold = 10_000;
  add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(world, 'warrior', 'player', 2, CONFIG.AI_HOME_X - 100);
  const record = decide(world);
  const raven = candidate(record, 'raven');
  expect(record.observed.information.currentlyVisibleEnemyCombatCount === 2, 'Visible enemy combat must be exposed as bounded information state.');
  expect(record.observed.information.currentEnemyCoverage === 1 && record.observed.information.scoutingNeed === 0, 'Fresh meaningful current visibility must produce zero scouting need.');
  expect(raven.utility.weightedTotal === 0 && record.selection.candidate?.action !== 'raven', 'Fresh enemy contact must keep Raven utility low and select a normal action.');
}

// Stale/empty observed information can make Raven meaningful for a wealthy
// Build Army state; no Scout goal is introduced.
{
  const world = worldForHard(902);
  world.teams[TEAM].gold = 10_000;
  world.matchElapsedTime = 120;
  add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  // V1's timing peak makes this a legitimate middle Build Army case.
  add(world, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  world.aiMemory[TEAM] = {
    currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {},
    lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0, knownEnemyBase: { x: CONFIG.PLAYER_HOME_X, y: CONFIG.GROUND_Y },
  };
  const record = decide(world);
  const raven = candidate(record, 'raven');
  expect(record.goal === 'buildArmy', 'Stale Raven fixture must remain under existing Build Army goal.');
  expect(record.observed.information.scoutingNeed > 0.95, 'No current contact and old observation must create high scouting need.');
  expect(record.selection.source === 'raven-utility' && record.selection.candidate?.action === 'raven' && record.selection.result?.ok, `Wealthy stale Build Army must select Raven as a candidate action: ${JSON.stringify(record.selection)}.`);
  expect(raven.utility.selected === true && world.teams[TEAM].buildIndex === 0, 'Raven selection must be explainable and must not advance the normal-unit build cycle.');
  expect(world.units.length === 13 && world.teams[TEAM].productionQueue.length === 0, 'Raven selection must preserve the existing population and normal queue.');
}

// The same observed memory must yield the same need regardless of hidden
// authoritative enemy population outside current vision.
{
  const one = worldForHard(903);
  const two = worldForHard(903);
  for (const world of [one, two]) {
    world.matchElapsedTime = 20;
    world.aiMemory[TEAM] = { currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0 };
  }
  add(two, 'warrior', 'player', 12, CONFIG.PLAYER_HOME_X);
  const a = buildAiAssessment(one, TEAM, DIFFICULTIES.hard).information;
  const b = buildAiAssessment(two, TEAM, DIFFICULTIES.hard).information;
  expect(JSON.stringify(a) === JSON.stringify(b), 'Hidden true enemy composition must not affect information-state assessment or scouting need.');
}

// Goal context is configuration-driven: equivalent information/economy makes
// Build Army/Attack more Raven-relevant than Recover.
{
  const world = worldForHard(904);
  world.teams[TEAM].gold = 10_000;
  world.matchElapsedTime = 120;
  add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(world, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  world.aiMemory[TEAM] = { currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0 };
  const assessment = buildAiAssessment(world, TEAM, DIFFICULTIES.hard);
  const recover = getRavenUtility({ assessment, goal: 'recover', difficulty: DIFFICULTIES.hard, cheapestCombatCost: CONFIG.UNIT_STATS.warrior.cost });
  const buildArmy = getRavenUtility({ assessment, goal: 'buildArmy', difficulty: DIFFICULTIES.hard, cheapestCombatCost: CONFIG.UNIT_STATS.warrior.cost });
  const attack = getRavenUtility({ assessment, goal: 'attack', difficulty: DIFFICULTIES.hard, cheapestCombatCost: CONFIG.UNIT_STATS.warrior.cost });
  expect(buildArmy.weightedTotal > recover.weightedTotal && attack.weightedTotal > recover.weightedTotal, 'Build Army and Attack context must value equivalent stale information above Recover.');
}

// Recover with barely enough Raven gold must preserve combat rebuilding over
// information. Cooldown/active state must remain feasibility gates, not scores.
{
  const world = worldForHard(905);
  world.teams[TEAM].gold = CONFIG.RAVEN.cost + 50;
  world.teams[TEAM].recovering = true;
  add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  world.matchElapsedTime = 120;
  world.aiMemory[TEAM] = { currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0 };
  const record = decide(world);
  expect(record.goal === 'recover' && record.selection.candidate?.kind === 'warrior', `Recover with 800g must prefer urgent combat rebuild: ${JSON.stringify(record.selection)}.`);
  const raven = candidate(record, 'raven');
  expect(raven.utility.weightedTotal < candidate(record, 'unit', 'warrior').utility.weightedTotal, 'Recover Raven utility must lose to combat reserve/recovery.');

  const cooldownWorld = worldForHard(906);
  cooldownWorld.teams[TEAM].gold = 10_000;
  add(cooldownWorld, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  cooldownWorld.teams[TEAM].ravenCooldownTimer = 10;
  cooldownWorld.matchElapsedTime = 30;
  cooldownWorld.aiMemory[TEAM] = { currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0 };
  const cooldown = decide(cooldownWorld);
  expect(candidate(cooldown, 'raven').feasibility.reason === 'ravenCooldown' && candidate(cooldown, 'raven').utility === null, 'High need must not bypass Raven cooldown feasibility.');

  const activeWorld = worldForHard(907);
  activeWorld.teams[TEAM].gold = 10_000;
  add(activeWorld, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  buyRaven(activeWorld, TEAM);
  activeWorld.matchElapsedTime = 30;
  const active = decide(activeWorld);
  expect(candidate(active, 'raven').feasibility.reason === 'ravenActive' && active.selection.candidate?.action !== 'raven', 'An active Raven must block a second selection through normal feasibility.');
}

// Raven source information refreshes the same observation path and lowers need;
// after normal loss of sight and staleness, need rises again.
{
  const world = worldForHard(908);
  world.teams[TEAM].gold = CONFIG.RAVEN.cost;
  add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(world, 'warrior', 'player', 2, CONFIG.PLAYER_HOME_X + 100);
  expect(buyRaven(world, TEAM).ok, 'Raven information fixture must launch an AI Raven.');
  for (let i = 0; i < 700; i++) runTick(world, DT);
  updateAiMemory(world, TEAM, DIFFICULTIES.hard.memoryStaleness);
  const refreshed = buildAiAssessment(world, TEAM, DIFFICULTIES.hard).information;
  expect(refreshed.currentlyVisibleEnemyCombatCount > 0 && refreshed.scoutingNeed === 0, 'Raven reveal must refresh normal AI current observation and lower need.');
  for (let i = 0; i < 601; i++) runTick(world, DT);
  world.matchElapsedTime += DIFFICULTIES.hard.scouting.staleTime;
  updateAiMemory(world, TEAM, DIFFICULTIES.hard.memoryStaleness);
  const stale = buildAiAssessment(world, TEAM, DIFFICULTIES.hard).information;
  expect(stale.scoutingNeed > refreshed.scoutingNeed, 'After reveal expiry and ordinary information aging, scouting need must rise.');
}

// Equal seed/state yields identical decision and Raven utility record.
{
  function snapshot(seed) {
    const world = worldForHard(seed);
    world.teams[TEAM].gold = 10_000;
    world.matchElapsedTime = 120;
    add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
    world.aiMemory[TEAM] = { currentlyVisibleEnemies: [], currentlyVisibleComposition: {}, rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [], composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0 };
    const record = decide(world);
    return JSON.stringify({ selection: record.selection, raven: candidate(record, 'raven'), information: record.observed.information });
  }
  expect(snapshot(909) === snapshot(909), 'Identical seed/state must produce identical Raven utility and purchase choice.');
}

console.log('PASS — Hard Raven V0 information-state, utility, feasibility, selection, refresh/decay, isolation, and determinism contracts hold.');
