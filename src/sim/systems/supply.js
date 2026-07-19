import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';

export function livingStructures(world, team) {
  return world.structures.filter((s) => s.team === team && isAliveEntity(s));
}

export function getCap(world, team) {
  return CONFIG.BASE_UNIT_CAP + livingStructures(world, team).length * CONFIG.STRUCTURE_CAP_BONUS;
}

// Ordinal priority for combat.js's retarget-on-threat check — lower
// switches in over higher. Living combat units > miners > structures >
// statue (statue-gating is enforced by findAttackTarget's tier order
// below, not by this ranking).
export function targetPriorityTier(entity) {
  if (entity.isStatue) return 3;
  if (entity.isStructure) return 2;
  if (entity.isMiner) return 1;
  return 0;
}

// Nearest living enemy combat unit (warrior/archer/hero) in range if any;
// else nearest living enemy miner in range — living defenders are always
// preferred over miners when both are reachable, not just "nearest."
function findPriorityUnitWithin(world, unit) {
  let nearestCombat = null;
  let nearestCombatDist = Infinity;
  let nearestMiner = null;
  let nearestMinerDist = Infinity;

  for (const other of world.units) {
    if (other.team === unit.team || !isAliveEntity(other)) continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist > unit.acquireRange) continue;

    if (other.isMiner) {
      if (dist < nearestMinerDist) {
        nearestMiner = other;
        nearestMinerDist = dist;
      }
    } else if (dist < nearestCombatDist) {
      nearestCombat = other;
      nearestCombatDist = dist;
    }
  }

  return nearestCombat ?? nearestMiner;
}

// Nearest living enemy combat unit in range; else nearest living enemy
// miner in range; else nearest living enemy structure in range; else the
// enemy statue if in range. Structures are only skippable by being dead,
// so the statue is only ever reachable once none remain — this is the
// whole of the statue-gating rule.
export function findAttackTarget(world, unit) {
  const unitTarget = findPriorityUnitWithin(world, unit);
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
