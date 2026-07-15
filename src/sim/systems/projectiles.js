import { applyDamage } from './combat.js';

export function updateProjectiles(world, dt) {
  const remaining = [];
  for (const projectile of world.projectiles) {
    projectile.elapsed += dt;
    if (projectile.elapsed < projectile.duration) {
      remaining.push(projectile);
      continue;
    }

    const target = world.units.find((u) => u.id === projectile.targetId && u.state !== 'dying');
    if (target) applyDamage(target, projectile.damage);
  }
  world.projectiles = remaining;
}
