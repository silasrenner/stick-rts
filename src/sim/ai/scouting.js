import { CONFIG } from '../../config.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isCombatObservation(enemy) {
  return !enemy.isStructure && !enemy.isStatue && enemy.kind !== 'miner';
}

function isStructureObservation(enemy) {
  return enemy.isStructure === true && !enemy.isStatue;
}

function count(enemies, predicate) {
  return (enemies ?? []).filter(predicate).length;
}

// This is intentionally a bounded observation summary: it accepts copied AI
// memory only. It never reads world.units/structures or compares a snapshot to
// hidden state to decide whether information is "correct".
export function buildInformationState(memory, now, scoutingConfig) {
  const currentlyVisibleEnemies = memory.currentlyVisibleEnemies ?? [];
  const rememberedEnemyUnits = memory.rememberedEnemyUnits ?? [];
  const rememberedEnemyStructures = memory.rememberedEnemyStructures ?? [];
  const currentlyVisibleEnemyCombatCount = count(currentlyVisibleEnemies, isCombatObservation);
  const currentlyVisibleEnemyStructureCount = count(currentlyVisibleEnemies, isStructureObservation);
  const rememberedEnemyCombatCount = count(rememberedEnemyUnits, isCombatObservation);
  const rememberedEnemyStructureCount = count(rememberedEnemyStructures, isStructureObservation);
  const lastCurrentEnemyContactAt = memory.lastCurrentEnemyContactAt ?? null;
  const lastMeaningfulEnemyObservationAt = memory.lastMeaningfulEnemyObservationAt ?? null;
  const timeSinceCurrentEnemyContact = lastCurrentEnemyContactAt === null ? Infinity : Math.max(0, now - lastCurrentEnemyContactAt);
  const timeSinceMeaningfulEnemyObservation = lastMeaningfulEnemyObservationAt === null
    ? Infinity
    : Math.max(0, now - lastMeaningfulEnemyObservationAt);
  const currentEnemyCoverage = currentlyVisibleEnemyCombatCount + currentlyVisibleEnemyStructureCount > 0 ? 1 : 0;
  const informationStaleness = lastMeaningfulEnemyObservationAt === null
    ? 1
    : clamp01(timeSinceMeaningfulEnemyObservation / scoutingConfig.staleTime);
  const scoutingNeed = clamp01(
    scoutingConfig.stalenessWeight * informationStaleness
    + scoutingConfig.coverageWeight * (1 - currentEnemyCoverage),
  );
  return {
    timeSinceCurrentEnemyContact,
    timeSinceMeaningfulEnemyObservation,
    currentlyVisibleEnemyCombatCount,
    currentlyVisibleEnemyStructureCount,
    rememberedEnemyCombatCount,
    rememberedEnemyStructureCount,
    enemyCompositionKnowledgeAge: timeSinceMeaningfulEnemyObservation,
    lastCurrentEnemyContactAt,
    lastMeaningfulEnemyObservationAt,
    currentEnemyCoverage,
    informationStaleness,
    scoutingNeed,
  };
}

function getBuildArmyScoutingTiming(armyBuildProgress, timingConfig) {
  if (!timingConfig) return 1;
  const progress = clamp01(armyBuildProgress ?? 0);
  const halfWidth = Math.max(timingConfig.halfWidth ?? 1, Number.EPSILON);
  const peak = clamp01(timingConfig.peakProgress ?? 0.5);
  const minimum = clamp01(timingConfig.minimumMultiplier ?? 0);
  const triangular = clamp01(1 - Math.abs(progress - peak) / halfWidth);
  return minimum + (1 - minimum) * triangular;
}

export function getRavenUtility({ assessment, goal, difficulty, cheapestCombatCost }) {
  const scouting = difficulty.scouting;
  const strategicScoutingWeight = scouting.goalWeights[goal] ?? 0;
  const scoutingTimingMultiplier = goal === 'buildArmy'
    ? getBuildArmyScoutingTiming(assessment.armyBuildProgress, scouting.buildArmyTiming)
    : 1;
  const readinessShortfall = Math.max(0, difficulty.attackLaunchCombatUnits - assessment.combatUnits);
  const protectedCombatReserve = cheapestCombatCost * Math.max(
    difficulty.economicNeed.reserveCombatUnits,
    readinessShortfall,
  );
  const scoutingAffordability = clamp01((assessment.gold - protectedCombatReserve) / CONFIG.RAVEN.cost);
  const { scoutingNeed, informationStaleness, currentEnemyCoverage } = assessment.information;
  return {
    scoutingNeed,
    informationStaleness,
    currentEnemyCoverage,
    strategicScoutingWeight,
    armyBuildProgress: assessment.armyBuildProgress,
    scoutingTimingMultiplier,
    scoutingAffordability,
    protectedCombatReserve,
    weightedTotal: scouting.utilityScale * scoutingNeed * strategicScoutingWeight * scoutingTimingMultiplier * scoutingAffordability,
  };
}
