import { CONFIG } from '../../config.js';
import { isAliveEntity, findAllEnemiesWithin } from '../world.js';
import { findAttackTarget } from './supply.js';
// resolveAttack/applyDamage live in combat.js, which imports
// getEffectiveCooldown from this module — a safe circular import since
// both sides only call each other's exports from inside functions, never
// at module-evaluation time.
import { resolveAttack, applyDamage } from './combat.js';

// Forgemaster's passive aura: nearby allies attack faster. Used wherever
// a cooldown is reset after firing, instead of reading attackCooldown
// directly.
export function getEffectiveCooldown(world, unit) {
  const hasAura = world.units.some(
    (u) =>
      u.kind === 'forgemaster' &&
      u.team === unit.team &&
      u.id !== unit.id &&
      isAliveEntity(u) &&
      Math.abs(u.x - unit.x) <= CONFIG.FORGEMASTER_AURA_RANGE
  );
  return hasAura ? unit.attackCooldown * (1 - CONFIG.FORGEMASTER_AURA_BONUS) : unit.attackCooldown;
}

// Decrements per-hero special cooldowns and each team's hero respawn
// cooldown. Runs every tick regardless of match/control state.
export function updateHeroCooldowns(world, dt) {
  for (const unit of world.units) {
    if (unit.isHero && unit.specialTimer > 0) unit.specialTimer -= dt;
  }
  for (const team of Object.values(world.teams)) {
    if (team.heroCooldownTimer > 0) team.heroCooldownTimer -= dt;
  }
}

// Moves the player's controlled hero from held-key input. Uncontrolled
// heroes are untouched here — they flow through the normal movement.js/
// combat.js pipeline like any other unit.
export function updateHeroControl(world, input, dt) {
  const hero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled && isAliveEntity(u));
  if (!hero) return;

  let dir = 0;
  if (input?.player?.moveLeft) dir -= 1;
  if (input?.player?.moveRight) dir += 1;

  if (dir !== 0) {
    hero.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH, hero.x + dir * hero.speed * dt));
    hero.facing = dir;
    hero.state = 'walking';
  } else {
    hero.state = 'idle';
  }

  const animHz = hero.state === 'walking' ? CONFIG.WALK_ANIM_HZ : CONFIG.IDLE_ANIM_HZ;
  hero.animPhase += dt * animHz * Math.PI * 2;
}

// Manual, keypress-triggered attack for a controlled hero — bypasses the
// auto-acquire loop entirely, finding its own target fresh each call.
export function attemptHeroAttack(world, hero) {
  if (hero.attackTimer > 0) return;
  const target = findAttackTarget(world, hero);
  if (!target) return;
  if (Math.abs(target.x - hero.x) > hero.range) return;
  resolveAttack(world, hero, target);
}

// Special-key trigger. Forgemaster has no active special (mining rate,
// aura, and reactive knockback are its whole kit) — this intentionally
// no-ops for it rather than erroring.
export function activateSpecial(world, hero) {
  if (hero.specialTimer > 0) return;

  if (hero.kind === 'hawkeye') {
    hero.specialTimer = CONFIG.HAWKEYE_SPECIAL_COOLDOWN;
    for (const enemy of findAllEnemiesWithin(world, hero, hero.range)) {
      applyDamage(world, enemy, CONFIG.HAWKEYE_SPECIAL_DAMAGE);
    }
  } else if (hero.kind === 'vanguard') {
    hero.specialTimer = CONFIG.VANGUARD_SPECIAL_COOLDOWN;
    const target = findAttackTarget(world, hero);
    const dir = target ? Math.sign(target.x - hero.x) || hero.facing : hero.facing;
    const travel = target
      ? Math.min(CONFIG.VANGUARD_CHARGE_DISTANCE, Math.max(0, Math.abs(target.x - hero.x) - hero.range))
      : CONFIG.VANGUARD_CHARGE_DISTANCE;
    hero.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH, hero.x + dir * travel));
  }
}
