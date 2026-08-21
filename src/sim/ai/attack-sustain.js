// Shared Attack sustain condition. It only considers a forward exception after a
// team has already committed to Attack; new launches still use the configured
// global launch threshold. Enemy comparison is current-vision-only because
// frontline.visibleEnemy* intentionally excludes mobile memory.
export function getAttackSustainReason(assessment, difficulty) {
  if (assessment.combatUnits >= difficulty.attackSustainCombatUnits) return 'global-combat';

  const progressThreshold = difficulty.forwardSustainObjectiveProgress;
  const minimumFrontlineCombat = difficulty.forwardSustainFrontlineCombatUnits;
  const frontline = assessment.frontline;
  const hasForwardPressure = Number.isFinite(progressThreshold)
    && Number.isFinite(minimumFrontlineCombat)
    && frontline.friendlyCombatCount >= minimumFrontlineCombat
    && assessment.objective.progress >= progressThreshold
    && frontline.friendlyPower >= frontline.visibleEnemyPower;
  return hasForwardPressure ? 'forward-frontline-pressure' : null;
}

export function shouldSustainAttack(assessment, difficulty) {
  return getAttackSustainReason(assessment, difficulty) !== null;
}
