export const STRATEGIC_GOALS = Object.freeze({
  recover: 'recover',
  buildArmy: 'buildArmy',
  defend: 'defend',
  attack: 'attack',
});

// This is intentionally a deterministic projection of existing Hard
// conditions, not a new policy. Command selection remains separate.
export function selectStrategicGoal(assessment, difficulty) {
  const recoveryNeeded = (assessment.recovering || (assessment.command === 'attack' && assessment.combatUnits === 0))
    && assessment.combatUnits < difficulty.minArmyToAttack;
  if (recoveryNeeded) return STRATEGIC_GOALS.recover;

  // Below the existing meaningful-army threshold, the current strategic
  // intent is rebuilding. Existing command logic can still issue Defend.
  if (assessment.combatUnits < difficulty.minArmyToAttack) return STRATEGIC_GOALS.buildArmy;

  if (assessment.defense.enemyNearHome || assessment.defense.underpowered) return STRATEGIC_GOALS.defend;
  return STRATEGIC_GOALS.attack;
}
