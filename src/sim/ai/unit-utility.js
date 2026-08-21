import { CONFIG } from '../../config.js';
import { DIFFICULTIES } from './difficulties.js';

function isCombatUnit(candidate) {
  return candidate.kind === 'warrior' || candidate.kind === 'archer';
}

export function getCheapestFeasibleCombatCost(candidateStates) {
  const costs = candidateStates
    .filter(({ candidate, feasibility }) => feasibility.feasible && isCombatUnit(candidate))
    .map(({ candidate }) => CONFIG.UNIT_STATS[candidate.kind].cost);
  // Economic need must still be explainable when combat is currently
  // unaffordable, so fall back to the representative cheapest combat cost.
  return costs.length > 0
    ? Math.min(...costs)
    : Math.min(CONFIG.UNIT_STATS.warrior.cost, CONFIG.UNIT_STATS.archer.cost);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

// Friendly-only diminishing return: reserve need falls linearly as gold covers
// several representative combat purchases, then is moderated (not capped) by
// an already established miner workforce. It never sees enemy state.
function getEconomicNeed(assessment, economicConfig, cheapestCombatCost) {
  if (!assessment || !economicConfig || !cheapestCombatCost) return 0;
  const reserveTarget = cheapestCombatCost * economicConfig.reserveCombatUnits;
  const reserveNeed = clamp01((reserveTarget - assessment.gold) / reserveTarget);
  const workforceNeed = Math.max(
    economicConfig.minimumMinerFactor,
    1 - assessment.living.miner / economicConfig.softMinerCount,
  );
  return reserveNeed * workforceNeed;
}

function getCounterWeightMultiplier(goal, assessment) {
  if (goal !== 'buildArmy') return 1;
  // Establish a broadly useful baseline first, then let legitimately observed
  // enemy composition increasingly steer the remaining prepared force.
  const progress = clamp01(assessment?.armyBuildProgress ?? 0);
  return 0.25 + 0.75 * progress;
}

function scoreCandidate(candidateState, weights, counterKind, buildCycleKind, cheapestCombatCost, economicNeed, counterWeightMultiplier) {
  const { candidate, feasibility } = candidateState;
  if (!feasibility.feasible) return { ...candidateState, utility: null };

  const combat = isCombatUnit(candidate);
  const recoveryProgress = combat ? 1 : 0;
  const combatEfficiency = combat ? cheapestCombatCost / CONFIG.UNIT_STATS[candidate.kind].cost : 0;
  const counterValue = candidate.kind === counterKind ? 1 : 0;
  const contextualCounterWeight = counterValue * weights.counterValue * counterWeightMultiplier;
  const buildCycleBias = candidate.kind === buildCycleKind ? 1 : 0;
  const candidateEconomicNeed = candidate.kind === 'miner' ? economicNeed : 0;
  const weightedTotal =
    recoveryProgress * weights.recoveryProgress
    + combatEfficiency * weights.combatEfficiency
    + contextualCounterWeight
    + buildCycleBias * weights.buildCycleBias
    + candidateEconomicNeed * (weights.economicNeed ?? 0);

  return {
    ...candidateState,
    utility: { recoveryProgress, combatEfficiency, counterValue, contextualCounterWeight, buildCycleBias, economicNeed: candidateEconomicNeed, weightedTotal },
  };
}

// Candidate order is the deterministic final tie-break. V0 intentionally has
// no random draw, hidden preference, or negative score for infeasible actions.
export function selectFeasibleUnitPurchase({ goal, difficulty, candidateStates, counterKind, buildCycleKind, assessment = null }) {
  const weights = DIFFICULTIES[difficulty].unitUtilityWeights?.[goal];
  if (!weights) return null;

  const cheapestCombatCost = getCheapestFeasibleCombatCost(candidateStates);
  const economicNeed = getEconomicNeed(assessment, DIFFICULTIES[difficulty].economicNeed, cheapestCombatCost);
  const counterWeightMultiplier = getCounterWeightMultiplier(goal, assessment);
  const scoredCandidates = candidateStates.map((candidateState) =>
    scoreCandidate(candidateState, weights, counterKind, buildCycleKind, cheapestCombatCost, economicNeed, counterWeightMultiplier),
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
