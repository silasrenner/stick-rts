import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';

export function livingStructures(world, team) {
  return world.structures.filter((s) => s.team === team && !s.isTurret && isAliveEntity(s));
}

export function livingTurrets(world, team) {
  return world.structures.filter((s) => s.team === team && s.isTurret && isAliveEntity(s));
}

export function getCap(world, team) {
  return CONFIG.BASE_UNIT_CAP + livingStructures(world, team).length * CONFIG.STRUCTURE_CAP_BONUS;
}

// Ordinal priority for combat.js's retarget-on-threat check — lower
// switches in over higher. Living combat units > miners > structures >
// statue (statue-gating is enforced by findAttackTarget's tier order
// below, not by this ranking).
export function targetPriorityTier(entity) {
  if (entity.isStartingTurret) return -1;
  if (entity.isStatue) return 3;
  if (entity.isStructure) return 2;
  if (entity.isMiner) return 1;
  return 0;
}

const SATURATION_ATTACKER_KINDS = new Set(['warrior', 'archer']);

function isSaturationAttacker(unit) {
  return SATURATION_ATTACKER_KINDS.has(unit.kind);
}

function committedSaturationAttackers(world, unit, candidate) {
  let count = 0;
  for (const other of world.units) {
    if (other.team === unit.team && isAliveEntity(other) && isSaturationAttacker(other) && other.targetId === candidate.id) count += 1;
  }
  return count;
}

// Select only within an already-established priority tier. Warriors and
// archers favor comparable candidates with fewer committed friendly
// warrior/archer attackers; all other attackers retain nearest-target choice.
function selectTargetWithinTier(world, unit, candidates) {
  let selected = null;
  let selectedScore = -Infinity;
  let selectedDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate.x - unit.x);
    const saturation = isSaturationAttacker(unit)
      ? CONFIG.TARGET_SATURATION.multipliers[Math.min(
        CONFIG.TARGET_SATURATION.multipliers.length - 1,
        committedSaturationAttackers(world, unit, candidate),
      )]
      : 1;
    const distancePreference = 1 - CONFIG.TARGET_SATURATION.distanceWeight * Math.min(1, distance / unit.acquireRange);
    const score = saturation * distancePreference;
    if (
      score > selectedScore
      || (score === selectedScore && distance < selectedDistance)
      || (score === selectedScore && distance === selectedDistance && candidate.id < selected.id)
    ) {
      selected = candidate;
      selectedScore = score;
      selectedDistance = distance;
    }
  }
  return selected;
}

// Living combat defenders still outrank miners; saturation is deliberately
// applied only after that tier choice is made.
function findPriorityUnitWithin(world, unit) {
  const combat = [];
  const miners = [];
  for (const other of world.units) {
    if (other.team === unit.team || !isAliveEntity(other) || Math.abs(other.x - unit.x) > unit.acquireRange) continue;
    (other.isMiner ? miners : combat).push(other);
  }
  return selectTargetWithinTier(world, unit, combat.length > 0 ? combat : miners);
}

// Nearest living enemy combat unit in range; else nearest living enemy
// miner in range; else nearest living enemy structure in range; else the
// enemy statue if in range. Structures are only skippable by being dead,
// so the statue is only ever reachable once none remain — this is the
// whole of the statue-gating rule.
export function findAttackTarget(world, unit) {
  const enemyTeam = unit.team === 'player' ? 'ai' : 'player';
  const coreTurret = world.structures.find((structure) =>
    structure.team === enemyTeam && structure.isStartingTurret && isAliveEntity(structure)
      && Math.abs(structure.x - unit.x) <= unit.acquireRange
  );
  if (coreTurret) return coreTurret;

  const unitTarget = findPriorityUnitWithin(world, unit);
  if (unitTarget) return unitTarget;

  const structuresInRange = world.structures.filter(
    (s) => s.team === enemyTeam && isAliveEntity(s) && Math.abs(s.x - unit.x) <= unit.acquireRange
  );
  if (structuresInRange.length > 0) return selectTargetWithinTier(world, unit, structuresInRange);

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
