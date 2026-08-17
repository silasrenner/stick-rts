import { CONFIG } from '../../config.js';
import { DIFFICULTIES } from './difficulties.js';

function isCombatUnit(candidate) {
  return candidate.kind === 'warrior' || candidate.kind === 'archer';
}

function getCheapestFeasibleCombatCost(candidateStates) {
  const costs = candidateStates
    .filter(({ candidate, feasibility }) => feasibility.feasible && isCombatUnit(candidate))
    .map(({ candidate }) => CONFIG.UNIT_STATS[candidate.kind].cost);
  return costs.length > 0 ? Math.min(...costs) : null;
}

function scoreCandidate(candidateState, weights, counterKind, buildCycleKind, cheapestCombatCost) {
  const { candidate, feasibility } = candidateState;
  if (!feasibility.feasible) return { ...candidateState, utility: null };

  const combat = isCombatUnit(candidate);
  const recoveryProgress = combat ? 1 : 0;
  const combatEfficiency = combat ? cheapestCombatCost / CONFIG.UNIT_STATS[candidate.kind].cost : 0;
  const counterValue = candidate.kind === counterKind ? 1 : 0;
  const buildCycleBias = candidate.kind === buildCycleKind ? 1 : 0;
  const weightedTotal =
    recoveryProgress * weights.recoveryProgress
    + combatEfficiency * weights.combatEfficiency
    + counterValue * weights.counterValue
    + buildCycleBias * weights.buildCycleBias;

  return {
    ...candidateState,
    utility: { recoveryProgress, combatEfficiency, counterValue, buildCycleBias, weightedTotal },
  };
}

// Candidate order is the deterministic final tie-break. V0 intentionally has
// no random draw, hidden preference, or negative score for infeasible actions.
export function selectFeasibleUnitPurchase({ goal, difficulty, candidateStates, counterKind, buildCycleKind }) {
  const weights = DIFFICULTIES[difficulty].unitUtilityWeights?.[goal];
  if (!weights) return null;

  const cheapestCombatCost = getCheapestFeasibleCombatCost(candidateStates);
  const scoredCandidates = candidateStates.map((candidateState) =>
    scoreCandidate(candidateState, weights, counterKind, buildCycleKind, cheapestCombatCost),
  );
  const feasible = scoredCandidates.filter(({ feasibility }) => feasibility.feasible);
  if (feasible.length === 0) {
    return {
      candidateStates: scoredCandidates,
      selected: null,
      tieBreak: { method: 'no-feasible-candidate', contenders: [] },
    };
  }

  const highestTotal = Math.max(...feasible.map(({ utility }) => utility.weightedTotal));
  const contenders = feasible.filter(({ utility }) => utility.weightedTotal === highestTotal);
  return {
    candidateStates: scoredCandidates,
    selected: contenders[0],
    tieBreak: {
      method: contenders.length > 1 ? 'candidate-order' : 'highest-utility',
      contenders: contenders.map(({ candidate }) => candidate.kind),
    },
  };
}
