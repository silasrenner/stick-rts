import { findEntityById } from '../world.js';
import { applyDamage } from './combat.js';

export function updateProjectiles(world, dt) {
  const remaining = [];
  for (const projectile of world.projectiles) {
    projectile.elapsed += dt;
    if (projectile.elapsed < projectile.duration) {
      remaining.push(projectile);
      continue;
    }

    const target = findEntityById(world, projectile.targetId);
    if (target) applyDamage(world, target, projectile.damage, projectile.team);
  }
  world.projectiles = remaining;
}
