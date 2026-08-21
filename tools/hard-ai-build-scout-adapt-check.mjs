import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { selectStrategicGoal } from '../src/sim/ai/goals.js';
import { getRavenUtility } from '../src/sim/ai/scouting.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const TEAM = 'ai';
const DT = 1 / CONFIG.TICK_HZ;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function worldForHard(seed = 1201) {
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
  for (let i = 0; i < count; i += 1) {
    world.units.push(createUnit(kind, team, x + i * 8, CONFIG.GROUND_Y));
  }
}

function staleMemory(world) {
  world.matchElapsedTime = 120;
  world.aiMemory[TEAM] = {
    currentlyVisibleEnemies: [], currentlyVisibleComposition: {},
    rememberedEnemyUnits: [], rememberedComposition: {}, rememberedEnemyStructures: [],
    composition: {}, lastMeaningfulEnemyObservationAt: 0, lastCurrentEnemyContactAt: 0,
  };
}

function decide(world) {
  world.teams[TEAM].decisionTimer = 0;
  updateAiDecisions(world, DT);
  return world.teams[TEAM].lastAiDecision;
}

function candidate(record, action, kind = null) {
  return record.candidates.find((entry) => entry.candidate.action === action && entry.candidate.kind === kind);
}

// New attacks require the configurable prepared 24-combat force. Raven is not
// a readiness prerequisite: stale information and an unavailable Raven cannot
// block a legal 24-unit launch.
{
  const below = worldForHard(1201);
  add(below, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(below, 'warrior', TEAM, 23, CONFIG.AI_HOME_X - 100);
  staleMemory(below);
  const belowAssessment = buildAiAssessment(below, TEAM, DIFFICULTIES.hard);
  expect(selectStrategicGoal(belowAssessment, DIFFICULTIES.hard) === 'buildArmy', '23 combat units must remain Build Army.');

  const ready = worldForHard(1202);
  ready.teams[TEAM].ravenCooldownTimer = 10;
  add(ready, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(ready, 'warrior', TEAM, 24, CONFIG.AI_HOME_X - 100);
  staleMemory(ready);
  const record = decide(ready);
  expect(record.goal === 'attack' && record.command === 'attack', '24 combat units with stale, cooldown-blocked Raven must launch Attack.');
}

// Progress is authoritative friendly combat / configurable launch size.
{
  for (const [combat, expected] of [[0, 0], [12, 0.5], [24, 1]]) {
    const world = worldForHard(1210 + combat);
    add(world, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
    add(world, 'warrior', TEAM, combat, CONFIG.AI_HOME_X - 100);
    const assessment = buildAiAssessment(world, TEAM, DIFFICULTIES.hard);
    expect(assessment.armyBuildProgress === expected, `Expected ${combat} combat progress ${expected}; got ${assessment.armyBuildProgress}.`);
  }
}

// Build Army Raven timing is smooth and context-only: early progress is less
// attractive than mid-build, while fresh meaningful information suppresses it.
{
  const early = worldForHard(1221);
  early.teams[TEAM].gold = 10_000;
  add(early, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(early, 'warrior', TEAM, 2, CONFIG.AI_HOME_X - 100);
  staleMemory(early);
  const earlyAssessment = buildAiAssessment(early, TEAM, DIFFICULTIES.hard);
  const earlyRaven = getRavenUtility({ assessment: earlyAssessment, goal: 'buildArmy', difficulty: DIFFICULTIES.hard, cheapestCombatCost: CONFIG.UNIT_STATS.warrior.cost });

  const mid = worldForHard(1222);
  mid.teams[TEAM].gold = 10_000;
  add(mid, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(mid, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  staleMemory(mid);
  const midRecord = decide(mid);
  const midRaven = candidate(midRecord, 'raven');
  expect(midRaven.utility.scoutingTimingMultiplier > earlyRaven.scoutingTimingMultiplier, 'Mid-build scouting timing must exceed early-build timing.');
  expect(midRecord.selection.candidate?.action === 'raven', 'A healthy stale mid-build army must allow Raven to win the normal-unit comparison.');

  const fresh = worldForHard(1223);
  fresh.teams[TEAM].gold = 10_000;
  add(fresh, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(fresh, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  add(fresh, 'warrior', 'player', 4, CONFIG.AI_HOME_X - 100);
  const freshRecord = decide(fresh);
  expect(candidate(freshRecord, 'raven').utility.weightedTotal === 0, 'Fresh meaningful enemy observation must suppress mid-build Raven value.');
}

// Legitimate observed composition changes the later Build Army normal-unit
// utility; hidden enemy units do not. Raven still never advances buildIndex.
{
  const observed = worldForHard(1231);
  observed.teams[TEAM].gold = 10_000;
  add(observed, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(observed, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  add(observed, 'warrior', 'player', 8, CONFIG.AI_HOME_X - 100);
  const observedRecord = decide(observed);
  expect(observedRecord.selection.counterKind === 'archer', 'Current legitimate warrior-heavy composition must produce the existing archer counter preference.');
  expect(candidate(observedRecord, 'unit', 'archer').utility.contextualCounterWeight > candidate(observedRecord, 'unit', 'warrior').utility.contextualCounterWeight, 'Later Build Army must increasingly weight the observed counter.');

  const hidden = worldForHard(1232);
  hidden.teams[TEAM].gold = 10_000;
  add(hidden, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(hidden, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  add(hidden, 'warrior', 'player', 8, CONFIG.PLAYER_HOME_X);
  staleMemory(hidden);
  const hiddenRecord = decide(hidden);
  expect(hiddenRecord.selection.counterKind === null, 'Hidden enemy composition must not produce a counter preference before observation.');

  const raven = worldForHard(1233);
  raven.teams[TEAM].gold = 10_000;
  add(raven, 'miner', TEAM, 1, CONFIG.AI_HOME_X);
  add(raven, 'warrior', TEAM, 12, CONFIG.AI_HOME_X - 100);
  staleMemory(raven);
  const ravenRecord = decide(raven);
  expect(ravenRecord.selection.candidate?.action === 'raven' && raven.teams[TEAM].buildIndex === 0, 'Raven selection must remain isolated from normal build-index progression.');
}

console.log('PASS — Hard Build → Scout → Adapt → Mass → Attack V1 launch, progress, Raven context, information boundary, counter adaptation, and build-index contracts hold.');
