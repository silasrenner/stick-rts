import { CONFIG } from '../../config.js';
import { createProjectile, findEntityById, isAliveEntity } from '../world.js';
import { findAttackTarget } from './supply.js';

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

    // targetId may point at a unit, structure, or statue (see supply.js's findAttackTarget)
    let target = unit.targetId ? findEntityById(world, unit.targetId) : null;
    if (!target || !isAliveEntity(target)) {
      target = findAttackTarget(world, unit);
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
        applyDamage(world, target, unit.damage);
      }
    }
  }
}

// Handles units, structures, and statues generically — the death-side
// effect differs by entity kind: units topple, structures fade out, a
// destroyed statue ends the match.
export function applyDamage(world, entity, amount) {
  if (!isAliveEntity(entity)) return;
  entity.hp = Math.max(0, entity.hp - amount);
  if (entity.hp > 0) return;

  if (entity.isStatue) {
    entity.state = 'destroyed';
    world.matchState = entity.team === 'player' ? 'lost' : 'won';
  } else if (entity.isStructure) {
    entity.state = 'destroyed';
    entity.destroyTimer = CONFIG.STRUCTURE_DESTROY_DURATION;
  } else {
    entity.state = 'dying';
    entity.deathTimer = CONFIG.DEATH_DURATION;
  }
}

export function updateDeaths(world, dt) {
  for (const unit of world.units) {
    if (unit.state === 'dying') unit.deathTimer -= dt;
  }
  world.units = world.units.filter((u) => !(u.state === 'dying' && u.deathTimer <= 0));
}
