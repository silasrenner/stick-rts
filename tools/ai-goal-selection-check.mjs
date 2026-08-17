import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { STRATEGIC_GOALS, selectStrategicGoal } from '../src/sim/ai/goals.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const team = 'ai';
const difficulty = DIFFICULTIES.hard;

function createHardWorld() {
  const world = createWorld(91);
  world.matchState = 'playing';
  world.teams[team].difficulty = 'hard';
  world.teams[team].gold = 10_000;
  return world;
}

function addUnits(world, kind, owner, count, startX) {
  for (let i = 0; i < count; i += 1) {
    world.units.push(createUnit(kind, owner, startX + i * 10, CONFIG.GROUND_Y));
  }
}

function expectGoal(label, world, expected) {
  const actual = selectStrategicGoal(buildAiAssessment(world, team, difficulty), difficulty);
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}.`);
}

{
  const world = createHardWorld();
  world.teams[team].recovering = true;
  addUnits(world, 'warrior', team, 2, CONFIG.AI_HOME_X);
  expectGoal('active under-strength recovery', world, STRATEGIC_GOALS.recover);
}

{
  const world = createHardWorld();
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  expectGoal('under-strength non-recovery army', world, STRATEGIC_GOALS.buildArmy);
}

{
  const world = createHardWorld();
  addUnits(world, 'warrior', team, 5, CONFIG.AI_HOME_X);
  expectGoal('offensive-ready army', world, STRATEGIC_GOALS.attack);
}

{
  const world = createHardWorld();
  addUnits(world, 'warrior', team, 5, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', 'player', 1, CONFIG.AI_HOME_X - 100);
  expectGoal('existing near-home defense condition', world, STRATEGIC_GOALS.defend);
}

{
  const world = createHardWorld();
  addUnits(world, 'warrior', team, 5, CONFIG.AI_HOME_X);
  world.aiMemory[team] = { composition: { warrior: 10 }, lastScoutedAt: 0 };
  expectGoal('existing relative-power defense condition', world, STRATEGIC_GOALS.defend);
}

function expectSelection(label, setup, source, kind) {
  const world = createHardWorld();
  world.teams[team].decisionTimer = 0;
  setup(world);
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
  const selection = world.teams[team].lastAiDecision.selection;
  if (selection.source !== source || selection.candidate.kind !== kind) {
    throw new Error(`${label}: expected ${source}/${kind}, got ${JSON.stringify(selection)}.`);
  }
}

expectSelection('no-miner override', () => {}, 'no-miner', 'miner');
expectSelection('counter input selects its feasible archer', (world) => {
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', 'player', 3, CONFIG.PLAYER_HOME_X);
}, 'unit-utility', 'archer');
expectSelection('build-cycle input selects warrior without a counter', (world) => {
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'miner', 'player', 1, CONFIG.PLAYER_HOME_X);
}, 'unit-utility', 'warrior');

{
  const world = createHardWorld();
  world.teams[team].decisionTimer = 0;
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
  if (world.teams[team].strategicGoal !== STRATEGIC_GOALS.buildArmy) {
    throw new Error(`Team state must expose the selected goal; got ${world.teams[team].strategicGoal}.`);
  }
  if (world.teams[team].lastAiDecision.goal !== STRATEGIC_GOALS.buildArmy) {
    throw new Error(`Decision record must expose the selected goal; got ${world.teams[team].lastAiDecision.goal}.`);
  }
}

console.log('PASS — explicit strategic goals remain deterministic and Phase 3 preserves the zero-miner path while exposing utility-driven normal purchases.');
