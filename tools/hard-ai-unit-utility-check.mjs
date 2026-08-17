import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { selectFeasibleUnitPurchase } from '../src/sim/ai/unit-utility.js';
import { createPurchaseCandidate } from '../src/sim/ai/actions.js';
import { getPurchaseFeasibility } from '../src/sim/systems/economy.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const team = 'ai';

function createHardWorld(seed = 131) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams[team].difficulty = 'hard';
  world.teams[team].decisionTimer = 0;
  world.teams[team].gold = 10_000;
  return world;
}

function addUnits(world, kind, owner, count, startX) {
  for (let i = 0; i < count; i += 1) {
    world.units.push(createUnit(kind, owner, startX + i * 10, CONFIG.GROUND_Y));
  }
}

function decide(world) {
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
  return world.teams[team].lastAiDecision;
}

function assertSelection(label, record, expectedGoal, expectedKind, expectedSource = 'unit-utility') {
  if (record.goal !== expectedGoal) throw new Error(`${label}: expected goal ${expectedGoal}, got ${record.goal}.`);
  if (record.selection.source !== expectedSource || record.selection.candidate?.kind !== expectedKind) {
    throw new Error(`${label}: expected ${expectedSource}/${expectedKind}, got ${JSON.stringify(record.selection)}.`);
  }
  if (!record.selection.result?.ok) throw new Error(`${label}: selected purchase must execute; got ${JSON.stringify(record.selection.result)}.`);
}

// Phase 0: enemy warriors make archer the legacy counter, but only warrior
// is feasible. The utility path must select a feasible productive unit.
{
  const world = createHardWorld();
  world.teams[team].gold = CONFIG.UNIT_STATS.warrior.cost;
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', 'player', 3, CONFIG.PLAYER_HOME_X);
  const record = decide(world);
  assertSelection('infeasible counter fallback', record, 'buildArmy', 'warrior');
  const archer = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'archer');
  if (archer.feasibility.reason !== 'gold' || archer.utility !== null) {
    throw new Error(`Infeasible archer must be recorded but unscored; got ${JSON.stringify(archer)}.`);
  }
}

// The old counter relationship remains a stronger input than cycle bias when
// the counter is legal, across each currently reachable non-Recover goal.
for (const [label, setup, goal] of [
  ['Build Army counter', (world) => addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X), 'buildArmy'],
  ['Defend counter', (world) => {
    addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
    addUnits(world, 'warrior', team, 5, CONFIG.AI_HOME_X - 40);
    addUnits(world, 'warrior', 'player', 1, CONFIG.AI_HOME_X - 100);
  }, 'defend'],
  ['Attack counter', (world) => {
    addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
    addUnits(world, 'warrior', team, 5, CONFIG.AI_HOME_X - 40);
  }, 'attack'],
]) {
  const world = createHardWorld();
  setup(world);
  addUnits(world, 'warrior', 'player', 3, CONFIG.PLAYER_HOME_X);
  assertSelection(label, decide(world), goal, 'archer');
}

// With no composition counter, the cycle's current warrior preference breaks
// the otherwise zero-score non-Recover tie.
{
  const world = createHardWorld();
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'miner', 'player', 1, CONFIG.PLAYER_HOME_X);
  const record = decide(world);
  assertSelection('build-cycle fallback', record, 'buildArmy', 'warrior');
  if (record.selection.utility.buildCycleBias !== 1) throw new Error('Cycle fallback must expose its bias.');
  if (world.teams[team].buildIndex !== 1) throw new Error(`Cycle fallback must advance buildIndex once; got ${world.teams[team].buildIndex}.`);
}

// Recover gives each combat unit equal progress, but the cheaper feasible
// warrior gets stronger efficiency and wins with the supplied V0 weights.
{
  const world = createHardWorld();
  world.teams[team].recovering = true;
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', team, 2, CONFIG.AI_HOME_X - 40);
  const record = decide(world);
  assertSelection('Recover efficiency', record, 'recover', 'warrior');
  const warrior = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'warrior');
  const archer = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'archer');
  if (warrior.utility.recoveryProgress !== 1 || archer.utility.recoveryProgress !== 1) throw new Error('Both combat units must count equally toward recovery progress.');
  if (!(warrior.utility.combatEfficiency > archer.utility.combatEfficiency)) throw new Error('Cheaper warrior must have stronger combat efficiency.');
  if (!(warrior.utility.weightedTotal > archer.utility.weightedTotal)) throw new Error('Recover V0 weights must prefer the cheaper combat unit.');
}

// Zero miners remains above the utility path.
{
  const world = createHardWorld();
  const record = decide(world);
  assertSelection('zero-miner emergency', record, 'buildArmy', 'miner', 'no-miner');
  if (record.selection.utility !== null) throw new Error('Zero-miner emergency must not enter V0 utility scoring.');
}

// If every unit is excluded by cap, normal scoring selects no unit and the
// existing capacity-expansion path still buys a legal structure.
{
  const world = createHardWorld();
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', team, 14, CONFIG.AI_HOME_X - 140);
  const record = decide(world);
  if (record.selection.candidate !== null || record.selection.fallback?.candidate.action !== 'structure' || !record.selection.fallback.result.ok) {
    throw new Error(`Population-cap expansion must remain outside unit scoring; got ${JSON.stringify(record.selection)}.`);
  }
}

// The selector itself must exclude infeasible candidates and use a stable
// candidate-order tie-break without random draws.
{
  const candidates = [
    createPurchaseCandidate('unit', 'miner'),
    createPurchaseCandidate('unit', 'warrior'),
    createPurchaseCandidate('unit', 'archer'),
  ];
  const world = createHardWorld();
  world.teams[team].gold = 110;
  const feasibility = candidates.map((candidate) => ({ candidate, feasibility: getPurchaseFeasibility(world, team, candidate) }));
  const one = selectFeasibleUnitPurchase({ goal: 'buildArmy', difficulty: 'hard', candidateStates: feasibility, counterKind: null, buildCycleKind: null });
  const two = selectFeasibleUnitPurchase({ goal: 'buildArmy', difficulty: 'hard', candidateStates: feasibility, counterKind: null, buildCycleKind: null });
  if (JSON.stringify(one) !== JSON.stringify(two)) throw new Error('Identical utility inputs must select identical records.');
  if (one.selected.candidate.kind !== 'miner' || one.tieBreak.method !== 'candidate-order') throw new Error(`Stable candidate-order tie-break expected miner; got ${JSON.stringify(one)}.`);
}

console.log('PASS — Phase 3 feasible unit utility selection covers liveness, legacy counter preference, cycle, recovery, cap, emergency, and determinism.');
