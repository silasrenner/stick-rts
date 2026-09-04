import { CONFIG } from '../../config.js';
import { findNearestEnemyWithin, findEntityById, isAliveEntity } from '../world.js';
import { getMinerDesiredX } from './mining.js';

// Sets state to 'idle'/'walking'; combat.js may override to 'attacking'
// afterward in this same tick. Controlled heroes are skipped entirely —
// their movement is player-driven (see heroes.js's updateHeroControl).
function minerIsThreatened(world, miner) {
  if (findNearestEnemyWithin(world, miner, miner.threatRange)) return true;
  // A ranged attacker can hold a miner as its live target from beyond the
  // miner's short proximity radius. Include both units and turrets: combat
  // refreshes targetId after movement, so this protects the miner on the next
  // movement tick before another attack can resolve.
  return [...world.units, ...world.structures].some(
    (enemy) => enemy.team !== miner.team && isAliveEntity(enemy) && enemy.targetId === miner.id
  );
}

export function updateMovement(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') continue;
    if (unit.isHero && unit.controlled) continue;

    let desiredX;
    let desiredY = unit.y;
    let holding = false;

    if (unit.isMiner) {
      if (minerIsThreatened(world, unit)) {
        desiredX = world.statues[unit.team].x;
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
      } else if (unit.defensiveEngagement) {
        // This point is supplied only by Hard's current-visible ranged-pressure
        // assessment and is bounded to first-to-second-turret coverage. Do not
        // substitute target.x here: that would grant generic pursuit authority.
        desiredX = unit.defensiveEngagement.x;
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
      } else {
        // Defend: every untargeted combat unit, including archers, returns
        // directly to the screening-line slot formation.js assigned.
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
