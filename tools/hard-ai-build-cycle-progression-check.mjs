import { CONFIG } from '../src/config.js';
import { applyBuildCycleProgression, updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const team = 'ai';

function createHardWorld(seed = 811) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams[team].difficulty = 'hard';
  world.teams[team].decisionTimer = 0;
  return world;
}

function addMiner(world, owner) {
  const x = owner === team ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
  world.units.push(createUnit('miner', owner, x, CONFIG.GROUND_Y));
}

function decide(world) {
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
  return world.teams[team].lastAiDecision;
}

// A decision with no feasible normal candidate is not production progress.
// It must leave the cycle position untouched and explain that hold in the
// bounded latest-decision record.
{
  const world = createHardWorld();
  addMiner(world, team);
  addMiner(world, 'player');
  world.teams[team].gold = 0;
  world.teams[team].buildIndex = 3;

  const record = decide(world);
  if (record.selection.candidate !== null || record.selection.result !== null) {
    throw new Error(`Expected no normal unit selection with zero gold; got ${JSON.stringify(record.selection)}.`);
  }
  if (world.teams[team].buildIndex !== 3) {
    throw new Error(`No-feasible decision must not advance buildIndex; got ${world.teams[team].buildIndex}.`);
  }
  if (record.selection.buildIndexBefore !== 3 || record.selection.didBuildIndexAdvance !== false || record.selection.buildIndexAfter !== 3 || record.selection.buildIndexReason !== 'no-normal-unit-commit') {
    throw new Error(`No-feasible decision must expose its held cycle state; got ${JSON.stringify(record.selection)}.`);
  }
}

// A successful normal utility purchase consumes exactly one cycle position.
{
  const world = createHardWorld();
  addMiner(world, team);
  addMiner(world, 'player');
  world.teams[team].gold = CONFIG.UNIT_STATS.warrior.cost;
  world.teams[team].buildIndex = 0;

  const record = decide(world);
  if (record.selection.candidate?.kind !== 'warrior' || !record.selection.result?.ok) {
    throw new Error(`Expected successful cycle-driven warrior purchase; got ${JSON.stringify(record.selection)}.`);
  }
  if (record.selection.buildIndexBefore !== 0 || record.selection.didBuildIndexAdvance !== true || record.selection.buildIndexAfter !== 1 || record.selection.buildIndexReason !== 'successful-normal-unit-commit') {
    throw new Error(`Successful normal purchase must advance buildIndex exactly once; got ${JSON.stringify(record.selection)}.`);
  }
  if (world.teams[team].buildIndex !== 1) throw new Error(`Expected buildIndex 1 after committed warrior; got ${world.teams[team].buildIndex}.`);
}

// An infeasible counter is recorded and excluded. Build Army's friendly
// readiness preference then selects the feasible combat fallback, which still
// consumes exactly one production preference position.
{
  const world = createHardWorld();
  addMiner(world, team);
  world.units.push(createUnit('warrior', team, CONFIG.AI_HOME_X - 700, CONFIG.GROUND_Y));
  for (let i = 0; i < 3; i += 1) {
    world.units.push(createUnit('warrior', 'player', CONFIG.AI_HOME_X - 600 + i * 10, CONFIG.GROUND_Y));
  }
  world.teams[team].gold = CONFIG.UNIT_STATS.warrior.cost;
  world.teams[team].buildIndex = 1; // miner cycle preference

  const record = decide(world);
  const archer = record.candidates.find(({ candidate }) => candidate.kind === 'archer');
  if (record.selection.counterKind !== 'archer' || archer.feasibility.reason !== 'gold') {
    throw new Error(`Expected recorded infeasible archer counter; got ${JSON.stringify(record.selection)}.`);
  }
  if (record.selection.candidate?.kind !== 'warrior' || !record.selection.result?.ok) {
    throw new Error(`Expected feasible combat fallback purchase; got ${JSON.stringify(record.selection)}.`);
  }
  if (!record.selection.didBuildIndexAdvance || record.selection.buildIndexBefore !== 1 || record.selection.buildIndexAfter !== 2) {
    throw new Error(`Committed infeasible-counter fallback must advance cycle once; got ${JSON.stringify(record.selection)}.`);
  }
}

// If authoritative execution rejects a candidate after inspection, the cycle
// must remain held. This directly exercises the progression boundary with an
// inspected-feasible but execution-failed normal selection.
{
  const world = createHardWorld();
  world.teams[team].buildIndex = 9;
  const selection = {
    source: 'unit-utility',
    candidate: { action: 'unit', kind: 'warrior' },
    feasibility: { feasible: true, reason: null },
    result: { ok: false, reason: 'queue' },
    buildIndexBefore: 9,
  };
  applyBuildCycleProgression(world, team, selection);
  if (selection.didBuildIndexAdvance || selection.buildIndexAfter !== 9 || selection.buildIndexReason !== 'no-normal-unit-commit' || world.teams[team].buildIndex !== 9) {
    throw new Error(`Failed authoritative execution must not consume the cycle; got ${JSON.stringify(selection)}.`);
  }
}

console.log('PASS — build cycle advances only for committed normal unit production.');
