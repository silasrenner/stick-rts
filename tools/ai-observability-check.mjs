import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { createPurchaseCandidates, findPurchaseCandidate } from '../src/sim/ai/actions.js';
import { getPurchaseFeasibility } from '../src/sim/systems/economy.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const world = createWorld(73);
world.matchState = 'playing';

const team = 'ai';
const state = world.teams[team];
state.difficulty = 'hard';
state.decisionTimer = 0;
state.gold = CONFIG.UNIT_STATS.warrior.cost;

world.units.push(createUnit('miner', team, CONFIG.AI_HOME_X, CONFIG.GROUND_Y));
for (let i = 0; i < 3; i += 1) {
  world.units.push(createUnit('warrior', 'player', CONFIG.PLAYER_HOME_X + i * 10, CONFIG.GROUND_Y));
}
// Mirror the fresh composition state that Hard refreshes at decision entry.
world.aiMemory[team] = { composition: { warrior: 3 }, lastScoutedAt: 0 };

const assessment = buildAiAssessment(world, team);
if (assessment.gold !== CONFIG.UNIT_STATS.warrior.cost) throw new Error('Assessment must expose current gold.');
if (assessment.enemyMemory.composition.warrior !== 3) throw new Error('Assessment must expose remembered enemy composition.');

const candidates = createPurchaseCandidates();
const archer = findPurchaseCandidate(candidates, 'unit', 'archer');
const warrior = findPurchaseCandidate(candidates, 'unit', 'warrior');
const archerFeasibility = getPurchaseFeasibility(world, team, archer);
const warriorFeasibility = getPurchaseFeasibility(world, team, warrior);
if (archerFeasibility.feasible || archerFeasibility.reason !== 'gold') {
  throw new Error(`Archer fixture must be infeasible for gold; got ${JSON.stringify(archerFeasibility)}.`);
}
if (!warriorFeasibility.feasible) throw new Error(`Warrior fixture must be feasible; got ${JSON.stringify(warriorFeasibility)}.`);

updateAiDecisions(world, 1 / CONFIG.TICK_HZ);

const record = state.lastAiDecision;
if (!record) throw new Error('AI decision must retain one bounded explanation record.');
if (record.selection.candidate.kind !== 'warrior' || record.selection.source !== 'unit-utility') {
  throw new Error(`Hard utility selection must choose the feasible productive candidate; got ${JSON.stringify(record.selection)}.`);
}
if (!record.selection.result.ok || record.selection.utility?.weightedTotal !== 0.25) {
  throw new Error(`Decision record must expose the executed utility winner; got ${JSON.stringify(record.selection)}.`);
}
const recordedArcher = record.candidates.find(({ candidate }) => candidate.action === 'unit' && candidate.kind === 'archer');
if (recordedArcher.feasibility.reason !== 'gold' || recordedArcher.utility !== null) {
  throw new Error(`Infeasible archer must remain visible but unscored; got ${JSON.stringify(recordedArcher)}.`);
}
if (!Array.isArray(record.candidates) || record.candidates.length !== candidates.length) {
  throw new Error('Decision record must contain the bounded candidate snapshot.');
}

console.log('PASS — AI assessment, feasibility, bounded explanation, and Phase 3 utility selection are observable.');
