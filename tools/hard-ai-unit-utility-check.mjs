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
  world.teams[team].ravenCooldownTimer = Infinity;
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
  addUnits(world, 'warrior', 'player', 3, CONFIG.AI_HOME_X - 100);
  const record = decide(world);
  assertSelection('infeasible counter fallback', record, 'buildArmy', 'warrior');
  const archer = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'archer');
  if (archer.feasibility.reason !== 'gold' || archer.utility !== null) {
    throw new Error(`Infeasible archer must be recorded but unscored; got ${JSON.stringify(archer)}.`);
  }
}

// Later Build Army preserves the existing counter relationship over cycle bias
// once a meaningful prepared force exists. Defend/Attack goal boundaries are
// covered by the dedicated strategic-goal check.
for (const [label, setup, goal] of [
  ['Build Army counter', (world) => {
    addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
    // Counter influence intentionally grows through the prepared Build Army.
    addUnits(world, 'warrior', team, 9, CONFIG.AI_HOME_X - 200);
  }, 'buildArmy'],
]) {
  const world = createHardWorld();
  setup(world);
  addUnits(world, 'warrior', team, 3, CONFIG.AI_HOME_X - 700);
  addUnits(world, 'warrior', 'player', 3, CONFIG.AI_HOME_X - 600);
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

// Build Army must actively assemble the existing meaningful force from
// friendly state when no enemy composition is known. A miner cycle slot must
// remain secondary to feasible combat readiness below minArmyToAttack.
{
  const world = createHardWorld();
  world.teams[team].buildIndex = 1; // Hard cycle slot: miner.
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  const record = decide(world);
  assertSelection('Build Army readiness without enemy knowledge', record, 'buildArmy', 'warrior');
  const miner = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'miner');
  const warrior = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'warrior');
  const archer = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'archer');
  if (Object.keys(record.observed.enemyMemory.composition).length !== 0) throw new Error('Readiness fixture must have no enemy composition.');
  if (miner.utility.recoveryProgress !== 0 || warrior.utility.recoveryProgress !== 1 || archer.utility.recoveryProgress !== 1) {
    throw new Error(`Build Army readiness utility must distinguish combat candidates; got ${JSON.stringify(record.candidates)}.`);
  }
  if (!(warrior.utility.weightedTotal > miner.utility.weightedTotal)) {
    throw new Error(`Feasible combat must outrank a miner Build Army cycle slot; got ${JSON.stringify(record.candidates)}.`);
  }
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

// The selector itself must exclude infeasible candidates and remain
// deterministic. Under Build Army, an affordable combat candidate must beat
// the miner even when the combat candidate is not a cycle/counter preference.
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
  if (one.selected.candidate.kind !== 'warrior' || one.tieBreak.method !== 'highest-utility') throw new Error(`Build Army readiness expected warrior utility win; got ${JSON.stringify(one)}.`);
}

// Attack must reinforce a thin standing force from friendly state rather than
// letting a miner cycle slot win when no counter information exists.
{
  const world = createHardWorld();
  world.teams[team].command = 'attack';
  world.teams[team].buildIndex = 1; // Hard cycle slot: miner.
  addUnits(world, 'miner', team, 1, CONFIG.AI_HOME_X);
  addUnits(world, 'warrior', team, 12, CONFIG.AI_HOME_X - 40);
  const record = decide(world);
  assertSelection('Attack standing-force reinforcement', record, 'attack', 'warrior');
  const miner = record.candidates.find(({ candidate }) => candidate.kind === 'miner');
  const warrior = record.candidates.find(({ candidate }) => candidate.kind === 'warrior');
  if (!(warrior.utility.weightedTotal > miner.utility.weightedTotal)) {
    throw new Error(`Attack combat must beat miner cycle bias near sustain; got ${JSON.stringify(record.candidates)}.`);
  }
}

// A resource-constrained friendly economy retains non-zero miner need, while a
// large reserve materially suppresses it without changing the zero-miner path.
{
  const constrained = createHardWorld();
  constrained.teams[team].gold = CONFIG.UNIT_STATS.miner.cost;
  addUnits(constrained, 'miner', team, 1, CONFIG.AI_HOME_X);
  const constrainedRecord = decide(constrained);
  const constrainedMiner = constrainedRecord.candidates.find(({ candidate }) => candidate.kind === 'miner');
  if (!(constrainedMiner.utility.economicNeed > 0)) {
    throw new Error(`Resource-constrained miner must retain useful economic need; got ${JSON.stringify(constrainedMiner)}.`);
  }

  const saturated = createHardWorld();
  saturated.teams[team].buildIndex = 1; // miner cycle slot.
  addUnits(saturated, 'miner', team, 8, CONFIG.AI_HOME_X);
  const saturatedRecord = decide(saturated);
  const saturatedMiner = saturatedRecord.candidates.find(({ candidate }) => candidate.kind === 'miner');
  if (!(saturatedMiner.utility.economicNeed < constrainedMiner.utility.economicNeed * 0.25)) {
    throw new Error(`Large reserve must materially reduce miner economic need; got constrained=${constrainedMiner.utility.economicNeed}, saturated=${saturatedMiner.utility.economicNeed}.`);
  }
}

console.log('PASS — Phase 3 feasible unit utility selection covers liveness, legacy counter preference, cycle, recovery, cap, emergency, determinism, attack reinforcement, and economic saturation.');
