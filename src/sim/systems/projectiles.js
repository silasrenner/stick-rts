import { findEntityById, isAliveEntity } from '../world.js';
import { applyDamage } from './combat.js';

function applyImpactDamage(world, entity, amount, team, multiplier = 1) {
  if (!entity || !isAliveEntity(entity)) return;
  const staticTarget = entity.isStructure || entity.isStatue;
  applyDamage(world, entity, amount * (staticTarget ? multiplier : 1), team);
}

export function updateProjectiles(world, dt) {
  const remaining = [];
  for (const projectile of world.projectiles) {
    projectile.elapsed += dt;
    if (projectile.elapsed < projectile.duration) {
      remaining.push(projectile);
      continue;
    }

    const target = findEntityById(world, projectile.targetId);
    const impact = projectile.impact;
    if (!impact) {
      if (target) applyDamage(world, target, projectile.damage, projectile.team);
      continue;
    }
    applyImpactDamage(world, target, projectile.damage, projectile.team, impact.staticDamageMultiplier);
    for (const entity of [...world.units, ...world.structures, ...Object.values(world.statues)]) {
      if (entity.id === target?.id || entity.team === projectile.team || !isAliveEntity(entity)) continue;
      if (Math.hypot(entity.x - projectile.targetX, entity.y - projectile.targetY) <= impact.splashRadius) {
        applyImpactDamage(world, entity, impact.splashDamage, projectile.team, impact.staticDamageMultiplier);
      }
    }
  }
  world.projectiles = remaining;
}
