import { CONFIG } from '../../config.js';
import { createProjectile, findEntityById, findAllEnemiesWithin, isAliveEntity } from '../world.js';
import { findAttackTarget, targetPriorityTier } from './supply.js';
import { getEffectiveCooldown } from './heroes.js';

// Runs after movement, using this tick's positions: acquires/refreshes
// targets and resolves attacks for anyone already in range. Sets
// state = 'attacking' as the final render state for units that fire this
// tick, overriding movement's idle/walking choice for the frame.
// Controlled heroes still have their timers ticked here (so cooldowns and
// the attack pose decay correctly) but skip auto-acquire/auto-fire — their
// attacks are triggered manually via heroes.js's attemptHeroAttack.
export function updateCombat(world, dt) {
  for (const team of Object.values(world.teams)) {
    if (team.statueWarningTimer > 0) team.statueWarningTimer -= dt;
  }

  for (const unit of world.units) {
    if (unit.state === 'dying' || unit.isMiner) continue;

    if (unit.attackTimer > 0) unit.attackTimer -= dt;
    if (unit.attackAnimTimer > 0) unit.attackAnimTimer -= dt;

    if (unit.isHero && unit.controlled) continue;

    if (unit.command === 'retreat') {
      unit.targetId = null;
      continue;
    }

    // targetId may point at a unit, structure, or statue (see supply.js's findAttackTarget)
    let target = unit.targetId ? findEntityById(world, unit.targetId) : null;
    if (target && isAliveEntity(target)) {
      // Retarget-on-threat: a unit parked on a lower-priority target (a
      // structure/statue, or a miner) switches immediately if something
      // higher-priority enters range — checked every tick, not just at
      // acquisition. Skipped once already on a top-priority (tier 0)
      // target, since nothing can outrank it — keeps this cheap for the
      // common case of an active engagement.
      if (targetPriorityTier(target) > 0) {
        const better = findAttackTarget(world, unit);
        if (better && targetPriorityTier(better) < targetPriorityTier(target)) {
          target = better;
          unit.targetId = target.id;
        }
      }
    } else {
      target = findAttackTarget(world, unit);
      unit.targetId = target ? target.id : null;
    }
    if (!target) continue;

    const dist = Math.abs(target.x - unit.x);
    if (dist > unit.range) continue; // still approaching; movement.js closes the gap next tick

    if (unit.attackTimer <= 0) resolveAttack(world, unit, target);
  }

  for (const turret of world.structures) {
    if (!turret.isTurret || turret.state === 'destroyed') continue;
    if (turret.attackTimer > 0) turret.attackTimer -= dt;
    let target = turret.targetId ? findEntityById(world, turret.targetId) : null;
    if (!target || !isAliveEntity(target) || Math.abs(target.x - turret.x) > turret.acquireRange) {
      target = findAttackTarget(world, turret);
      turret.targetId = target ? target.id : null;
    }
    if (target && Math.abs(target.x - turret.x) <= turret.range && turret.attackTimer <= 0) resolveAttack(world, turret, target);
  }
}

// Fires a single attack
// were already checked by the caller (the auto-loop above, or a manual
// keypress via heroes.js's attemptHeroAttack). Shared so kit behavior
// (vanguard's cleave, forgemaster's knockback) applies no matter who
// triggered the attack.
export function resolveAttack(world, unit, target) {
  unit.attackTimer = getEffectiveCooldown(world, unit);
  unit.attackAnimTimer = CONFIG.ATTACK_ANIM_DURATION;
  unit.state = 'attacking';

  if (unit.projectileSpeed > 0) {
    world.projectiles.push(
      createProjectile(unit.team, unit.x, unit.y, target.x, target.y, target.id, unit.damage, unit.projectileSpeed)
    );
    return; // knockback is a melee-only reaction; a fired arrow can't be pushed back
  }

  const hits = unit.kind === 'vanguard' ? findAllEnemiesWithin(world, unit, unit.range) : [target];
  for (const hit of hits) {
    applyDamage(world, hit, unit.damage, unit.team);
    if (hit.kind === 'forgemaster') {
      const dir = Math.sign(unit.x - hit.x) || (unit.team === 'player' ? -1 : 1);
      unit.x += dir * CONFIG.FORGEMASTER_KNOCKBACK;
    }
  }
}

// Handles units, structures, and statues generically — the death-side
// effect differs by entity kind: units topple, structures fade out, a
// destroyed statue ends the match. A hero death additionally starts its
// team's respawn cooldown and escalates the next re-purchase cost.
export function applyDamage(world, entity, amount, killerTeam = null) {
  if (!isAliveEntity(entity)) return;
  if (entity.isStatue) world.teams[entity.team].statueWarningTimer = CONFIG.STATUE_WARNING_DURATION;
  entity.hp = Math.max(0, entity.hp - amount);
  if (entity.hp > 0) return;

  if (!entity.isStructure && !entity.isStatue && killerTeam && killerTeam !== entity.team) {
    world.teams[killerTeam].gold += Math.round(entity.goldValue * CONFIG.UNIT_KILL_REWARD_RATE);
  }

  if (entity.isStatue) {
    entity.state = 'destroyed';
    world.matchState = entity.team === 'player' ? 'lost' : 'won';
  } else if (entity.isStructure) {
    entity.state = 'destroyed';
    entity.destroyTimer = CONFIG.STRUCTURE_DESTROY_DURATION;
  } else {
    // Retain a match-total loss count after the death animation removes the
    // unit, so Watch telemetry never needs to infer casualties from state.
    world.teams[entity.team].losses += 1;
    if (entity.isHero) {
      const team = world.teams[entity.team];
      team.heroDeathCount += 1;
      team.heroCooldownTimer = CONFIG.HERO_RESPAWN_COOLDOWN;
    }
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
