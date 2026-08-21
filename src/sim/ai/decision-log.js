function copyCandidate(candidate) {
  return candidate ? { action: candidate.action, kind: candidate.kind } : null;
}

function copyFeasibility(feasibility) {
  return feasibility ? { feasible: feasibility.feasible, reason: feasibility.reason } : null;
}

function copyResult(result) {
  return result ? { ok: result.ok, reason: result.reason ?? null } : null;
}

function copyUtility(utility) {
  return utility ? {
    recoveryProgress: utility.recoveryProgress ?? null,
    combatEfficiency: utility.combatEfficiency ?? null,
    counterValue: utility.counterValue ?? null,
    contextualCounterWeight: utility.contextualCounterWeight ?? null,
    buildCycleBias: utility.buildCycleBias ?? null,
    economicNeed: utility.economicNeed ?? null,
    scoutingNeed: utility.scoutingNeed ?? null,
    informationStaleness: utility.informationStaleness ?? null,
    currentEnemyCoverage: utility.currentEnemyCoverage ?? null,
    strategicScoutingWeight: utility.strategicScoutingWeight ?? null,
    armyBuildProgress: utility.armyBuildProgress ?? null,
    scoutingTimingMultiplier: utility.scoutingTimingMultiplier ?? null,
    scoutingAffordability: utility.scoutingAffordability ?? null,
    protectedCombatReserve: utility.protectedCombatReserve ?? null,
    selected: utility.selected ?? false,
    weightedTotal: utility.weightedTotal,
  } : null;
}

function copyTieBreak(tieBreak) {
  return tieBreak ? { method: tieBreak.method, contenders: [...tieBreak.contenders] } : null;
}

export function createDecisionRecord({ assessment, goal, candidates, selection, turretAttempt, heroAttempt, command, attackCommitment }) {
  return {
    time: assessment.time,
    observed: assessment,
    goal,
    candidates: candidates.map(({ candidate, feasibility, utility = null }) => ({
      candidate: copyCandidate(candidate),
      feasibility: copyFeasibility(feasibility),
      utility: copyUtility(utility),
    })),
    selection: selection ? {
      source: selection.source,
      candidate: copyCandidate(selection.candidate),
      feasibility: copyFeasibility(selection.feasibility),
      utility: copyUtility(selection.utility),
      tieBreak: copyTieBreak(selection.tieBreak),
      counterKind: selection.counterKind ?? null,
      buildIndexBefore: selection.buildIndexBefore ?? null,
      buildCycleKind: selection.buildCycleKind ?? null,
      didBuildIndexAdvance: selection.didBuildIndexAdvance ?? false,
      buildIndexAfter: selection.buildIndexAfter ?? selection.buildIndexBefore ?? null,
      buildIndexReason: selection.buildIndexReason ?? null,
      result: copyResult(selection.result),
      fallback: selection.fallback ? {
        candidate: copyCandidate(selection.fallback.candidate),
        feasibility: copyFeasibility(selection.fallback.feasibility),
        result: copyResult(selection.fallback.result),
      } : null,
    } : null,
    turretAttempt: turretAttempt ? {
      candidate: copyCandidate(turretAttempt.candidate),
      feasibility: copyFeasibility(turretAttempt.feasibility),
      result: copyResult(turretAttempt.result),
    } : null,
    heroAttempt: heroAttempt ? {
      candidate: copyCandidate(heroAttempt.candidate),
      feasibility: copyFeasibility(heroAttempt.feasibility),
      result: copyResult(heroAttempt.result),
    } : null,
    attackCommitment,
    command,
  };
}
