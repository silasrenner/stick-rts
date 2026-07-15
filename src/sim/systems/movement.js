import { CONFIG } from '../../config.js';
import { findNearestEnemyWithin } from '../world.js';

// Acts on the target/command decisions from the previous combat tick.
// Sets state to 'idle'/'walking'; combat.js may override to 'attacking'
// afterward in this same tick.
export function updateMovement(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') continue;

    let desiredX;
    let holding = false;

    if (unit.isMiner) {
      const threat = findNearestEnemyWithin(world, unit, unit.threatRange);
      desiredX = threat ? unit.fleeX : unit.homeX;
    } else {
      const target = unit.targetId
        ? world.units.find((u) => u.id === unit.targetId && u.state !== 'dying')
        : null;

      if (target) {
        const dist = Math.abs(target.x - unit.x);
        if (dist <= unit.range) {
          desiredX = unit.x;
          holding = true;
        } else {
          desiredX = target.x;
        }
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
