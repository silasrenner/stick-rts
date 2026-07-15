import { CONFIG } from '../../config.js';
import { createProjectile, findNearestEnemyWithin } from '../world.js';

// Runs after movement, using this tick's positions: acquires/refreshes
// targets and resolves attacks for anyone already in range. Sets
// state = 'attacking' as the final render state for units that fire this
// tick, overriding movement's idle/walking choice for the frame.
export function updateCombat(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying' || unit.isMiner) continue;

    if (unit.attackTimer > 0) unit.attackTimer -= dt;
    if (unit.attackAnimTimer > 0) unit.attackAnimTimer -= dt;

    if (unit.command === 'retreat') {
      unit.targetId = null;
      continue;
    }

    let target = unit.targetId
      ? world.units.find((u) => u.id === unit.targetId && u.state !== 'dying')
      : null;

    if (!target) {
      target = findNearestEnemyWithin(world, unit, unit.acquireRange);
      unit.targetId = target ? target.id : null;
    }
    if (!target) continue;

    const dist = Math.abs(target.x - unit.x);
    if (dist > unit.range) continue; // still approaching; movement.js closes the gap next tick

    if (unit.attackTimer <= 0) {
      unit.attackTimer = unit.attackCooldown;
      unit.attackAnimTimer = CONFIG.ATTACK_ANIM_DURATION;
      unit.state = 'attacking';

      if (unit.projectileSpeed > 0) {
        world.projectiles.push(
          createProjectile(unit.team, unit.x, unit.y, target.x, target.y, target.id, unit.damage, unit.projectileSpeed)
        );
      } else {
        applyDamage(target, unit.damage);
      }
    }
  }
}

export function applyDamage(unit, amount) {
  if (unit.state === 'dying') return;
  unit.hp = Math.max(0, unit.hp - amount);
  if (unit.hp <= 0) {
    unit.state = 'dying';
    unit.deathTimer = CONFIG.DEATH_DURATION;
  }
}

export function updateDeaths(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') unit.deathTimer -= dt;
  }
  world.units = world.units.filter((u) => !(u.state === 'dying' && u.deathTimer <= 0));
}
