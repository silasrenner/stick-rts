import { CONFIG } from '../../config.js';
import { findNearestEnemyWithin, findEntityById, isAliveEntity } from '../world.js';
import { getMinerDesiredX } from './mining.js';

// Nearest living friendly warrior to `unit`, by x distance, or Infinity if
// none exist — used by the archer-cohesion check below. Deliberately
// checked fresh every tick (not a latched flag) so cohesion holds resume
// correctly once a warrior exists again after hitting zero.
function nearestFriendlyWarriorDistance(world, unit) {
  let nearest = Infinity;
  for (const other of world.units) {
    if (other.team !== unit.team || other.kind !== 'warrior' || !isAliveEntity(other)) continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist < nearest) nearest = dist;
  }
  return nearest;
}

// Acts on the target/command decisions from the previous combat tick.
// Sets state to 'idle'/'walking'; combat.js may override to 'attacking'
// afterward in this same tick. Controlled heroes are skipped entirely —
// their movement is player-driven (see heroes.js's updateHeroControl).
export function updateMovement(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') continue;
    if (unit.isHero && unit.controlled) continue;

    let desiredX;
    let desiredY = unit.y;
    let holding = false;

    if (unit.isMiner) {
      const threat = findNearestEnemyWithin(world, unit, unit.threatRange);
      if (threat) {
        desiredX = unit.fleeX;
      } else {
        const decision = getMinerDesiredX(unit, world);
        desiredX = decision.desiredX;
        holding = decision.holding;
      }
    } else {
      // targetId may now point at a unit, structure, or statue (see supply.js's findAttackTarget)
      const target = unit.targetId ? findEntityById(world, unit.targetId) : null;

      if (target && isAliveEntity(target)) {
        const dist = Math.abs(target.x - unit.x);
        if (dist <= unit.range) {
          desiredX = unit.x;
          holding = true;
        } else {
          desiredX = target.x; // combat approach stays 1D — y is formation-only, not a combat dimension
        }
      } else if (unit.minesGold) {
        // forgemaster: no combat target right now, so work the mine
        const decision = getMinerDesiredX(unit, world);
        desiredX = decision.desiredX;
        holding = decision.holding;
      } else if (unit.command === 'attack') {
        // sim/systems/formation.js assigns slotX/slotY every tick; fall
        // back to the old shared-point behavior for the one tick before
        // it's ever run (shouldn't happen in practice — formation runs
        // first in tick.js — but keeps this module standalone-safe).
        desiredX = unit.slotX ?? unit.enemyHomeX;
        desiredY = unit.slotY ?? unit.y;
      } else if (unit.command === 'retreat') {
        // Get home; no formation slot — retreat isn't a battle line.
        desiredX = unit.homeX;
      } else if (unit.kind === 'archer') {
        // A newly spawned defender must first reach its own mine-side slot.
        // Cohesion prevents an already-positioned archer from advancing
        // unsupported, but must not freeze it at home when no warrior exists.
        const sign = unit.team === 'player' ? 1 : -1;
        const behindAssignedSlot = sign * unit.x < sign * (unit.slotX ?? unit.homeX) - 2;
        if (behindAssignedSlot || nearestFriendlyWarriorDistance(world, unit) <= CONFIG.ARCHER_COHESION_DISTANCE) {
          desiredX = unit.slotX ?? unit.homeX;
          desiredY = unit.slotY ?? unit.y;
        } else {
          desiredX = unit.x;
          holding = true;
        }
      } else {
        // Defend, everyone else: the screening line formation.js computed.
        desiredX = unit.slotX ?? unit.homeX;
        desiredY = unit.slotY ?? unit.y;
      }
    }

    const dx = desiredX - unit.x;
    const dy = desiredY - unit.y;
    const dist = Math.hypot(dx, dy);
    if (!holding && dist > 2) {
      const moveDist = Math.min(dist, unit.speed * dt);
      unit.x += (dx / dist) * moveDist;
      unit.y += (dy / dist) * moveDist;
      if (dx !== 0) unit.facing = Math.sign(dx);
      unit.state = 'walking';
    } else {
      unit.state = 'idle';
    }

    const animHz = unit.state === 'walking' ? CONFIG.WALK_ANIM_HZ : CONFIG.IDLE_ANIM_HZ;
    unit.animPhase += dt * animHz * Math.PI * 2;
  }
}
