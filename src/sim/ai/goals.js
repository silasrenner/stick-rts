import { shouldSustainAttack } from './attack-sustain.js';

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
    && assessment.combatUnits < difficulty.attackLaunchCombatUnits;
  if (recoveryNeeded) return STRATEGIC_GOALS.recover;

  // A newly assembled force needs launch strength; a force that was already
  // attacking stays committed at the lower sustain boundary.
  const attackCommitted = assessment.command === 'attack';
  if (attackCommitted) {
    // A confirmed current threat still wins, but a remembered/estimated
    // relative-power deficit cannot break an attack above sustain.
    if (assessment.defense.enemyNearHome) return STRATEGIC_GOALS.defend;
    if (shouldSustainAttack(assessment, difficulty)) return STRATEGIC_GOALS.attack;
  }

  // Preserve the existing lower-force rebuilding priority, including when
  // contact is near home: the unit utility still produces the needed force.
  if (assessment.combatUnits < difficulty.attackLaunchCombatUnits) return STRATEGIC_GOALS.buildArmy;

  if (assessment.defense.enemyNearHome) return STRATEGIC_GOALS.defend;
  if (assessment.defense.underpowered) return STRATEGIC_GOALS.defend;

  return STRATEGIC_GOALS.attack;
}
