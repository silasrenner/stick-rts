import { CONFIG } from '../../config.js';
import { findNearestEnemyWithin, findEntityById, isAliveEntity } from '../world.js';
import { getMinerDesiredX } from './mining.js';

// Acts on the target/command decisions from the previous combat tick.
// Sets state to 'idle'/'walking'; combat.js may override to 'attacking'
// afterward in this same tick. Controlled heroes are skipped entirely —
// their movement is player-driven (see heroes.js's updateHeroControl).
export function updateMovement(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') continue;
    if (unit.isHero && unit.controlled) continue;

    let desiredX;
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
          desiredX = target.x;
        }
      } else if (unit.minesGold) {
        // forgemaster: no combat target right now, so work the mine
        const decision = getMinerDesiredX(unit, world);
        desiredX = decision.desiredX;
        holding = decision.holding;
      } else if (unit.command === 'attack') {
        desiredX = unit.enemyHomeX;
      } else {
        desiredX = unit.homeX; // defend or retreat
      }
    }

    const dx = desiredX - unit.x;
    if (!holding && Math.abs(dx) > 2) {
      const dir = Math.sign(dx);
      unit.x += dir * unit.speed * dt;
      unit.facing = dir;
      unit.state = 'walking';
    } else {
      unit.state = 'idle';
    }

    const animHz = unit.state === 'walking' ? CONFIG.WALK_ANIM_HZ : CONFIG.IDLE_ANIM_HZ;
    unit.animPhase += dt * animHz * Math.PI * 2;
  }
}
