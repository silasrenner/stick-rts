import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';

// Health recovery is authoritative simulation state. `lastDamagedAt` is set
// only by combat.applyDamage(), so any direct or projectile hit resets the
// shared no-damage window for units and defensive/buildable structures.
export function updateRegeneration(world, dt) {
  const entities = [...world.units, ...world.structures];
  for (const entity of entities) {
    if (!isAliveEntity(entity) || entity.isStatue || entity.hp >= entity.maxHp || entity.lastDamagedAt == null) continue;
    if (world.matchElapsedTime - entity.lastDamagedAt < CONFIG.REGEN_DELAY_SECONDS) continue;
    entity.hp = Math.min(entity.maxHp, entity.hp + entity.maxHp * dt / CONFIG.REGEN_FULL_HEAL_SECONDS);
  }
}
