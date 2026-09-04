import { createPurchaseCandidate } from '../src/sim/ai/actions.js';
import { selectFeasibleUnitPurchase } from '../src/sim/ai/unit-utility.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const candidates = ['warrior', 'catapult'].map((kind) => ({
  candidate: createPurchaseCandidate('unit', kind),
  feasibility: { feasible: true, reason: null },
}));
const baseAssessment = {
  gold: 10_000,
  living: { miner: 1 },
  armyBuildProgress: 0.5,
  enemyMemory: { rememberedStructures: [] },
};

const loneOrUnknown = selectFeasibleUnitPurchase({
  goal: 'buildArmy', difficulty: 'hard', candidateStates: candidates,
  counterKind: null, buildCycleKind: 'warrior', assessment: baseAssessment,
});
expect(loneOrUnknown.selected.candidate.kind === 'warrior', 'Without a deep observed turret line, Catapult must not displace the normal force purchase.');

const deepTurretLine = selectFeasibleUnitPurchase({
  goal: 'buildArmy', difficulty: 'hard', candidateStates: candidates,
  counterKind: null, buildCycleKind: 'warrior',
  assessment: {
    ...baseAssessment,
    enemyMemory: { rememberedStructures: [{ isTurret: true }, { isTurret: true }] },
  },
});
expect(deepTurretLine.selected.candidate.kind === 'catapult', 'Two observed turrets must give the legal Catapult utility enough contextual value to win.');
const catapult = deepTurretLine.candidateStates.find(({ candidate }) => candidate.kind === 'catapult');
expect(catapult.utility.siegeOpportunity === 1, 'The Catapult decision must expose its deep-turret-line reason.');

console.log('PASS — Hard Catapult utility remains inactive without a deep observed turret line and wins only with that contextual opportunity.');
