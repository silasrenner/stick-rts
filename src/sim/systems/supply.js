import { CONFIG } from '../../config.js';
import { isAliveEntity, findNearestEnemyWithin } from '../world.js';

export function livingStructures(world, team) {
  return world.structures.filter((s) => s.team === team && isAliveEntity(s));
}

export function getCap(world, team) {
  return CONFIG.BASE_UNIT_CAP + livingStructures(world, team).length * CONFIG.STRUCTURE_CAP_BONUS;
}

// Nearest living enemy unit in range; else nearest living enemy structure in
// range; else the enemy statue if in range. Structures are only skippable by
// being dead, so the statue is only ever reachable once none remain — this
// is the whole of the statue-gating rule.
export function findAttackTarget(world, unit) {
  const unitTarget = findNearestEnemyWithin(world, unit, unit.acquireRange);
  if (unitTarget) return unitTarget;

  const enemyTeam = unit.team === 'player' ? 'ai' : 'player';
  const structuresInRange = livingStructures(world, enemyTeam).filter(
    (s) => Math.abs(s.x - unit.x) <= unit.acquireRange
  );
  if (structuresInRange.length > 0) {
    return structuresInRange.reduce((nearest, s) =>
      Math.abs(s.x - unit.x) < Math.abs(nearest.x - unit.x) ? s : nearest
    );
  }

  const statue = world.statues[enemyTeam];
  if (isAliveEntity(statue) && Math.abs(statue.x - unit.x) <= unit.acquireRange) {
    return statue;
  }

  return null;
}

export function updateStructureDeaths(world, dt) {
  for (const structure of world.structures) {
    if (structure.state === 'destroyed') structure.destroyTimer -= dt;
  }
  world.structures = world.structures.filter((s) => !(s.state === 'destroyed' && s.destroyTimer <= 0));
}
