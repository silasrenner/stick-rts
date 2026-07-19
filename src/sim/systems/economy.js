import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { getCap, livingStructures } from './supply.js';

export function canAfford(world, team, cost) {
  return world.teams[team].gold >= cost;
}

// Excludes heroes — the brief exempts them from the population cap.
export function getUnitCount(world, team) {
  return world.units.filter((u) => u.team === team && !u.isHero && isAliveEntity(u)).length;
}

export function hasLivingHero(world, team) {
  return world.units.some((u) => u.team === team && u.isHero && isAliveEntity(u));
}

export function getHeroCost(world, team) {
  return Math.round(CONFIG.BASE_HERO_COST * CONFIG.HERO_COST_MULTIPLIER ** world.teams[team].heroDeathCount);
}

// Purchases already in the queue but not yet materialized (sim/systems/
// production.js) — counted alongside live entities wherever a cap/max
// check needs "effective" count, since the queue can hold several of the
// same kind before any of them actually exists yet.
export function countQueued(world, team, action) {
  return world.teams[team].productionQueue.filter((item) => item.action === action).length;
}

export function hasLivingOrQueuedHero(world, team) {
  return hasLivingHero(world, team) || countQueued(world, team, 'hero') > 0;
}

function getBuildTime(action, kind) {
  if (action === 'structure') return CONFIG.STRUCTURE_BUILD_TIME;
  if (action === 'hero') return CONFIG.HERO_BUILD_TIME;
  if (kind === 'miner') return CONFIG.MINER_BUILD_TIME;
  if (kind === 'warrior') return CONFIG.WARRIOR_BUILD_TIME;
  return CONFIG.ARCHER_BUILD_TIME;
}

function enqueue(world, team, action, kind) {
  const buildTime = getBuildTime(action, kind);
  world.teams[team].productionQueue.push({ action, kind, remaining: buildTime, total: buildTime });
}

// Validates, deducts gold, and enqueues — the entity itself materializes
// later (sim/systems/production.js) once the queue timer elapses. Checked
// once here, at enqueue time, against live + already-queued counts; not
// re-checked at completion (see PLAN.md S8).
// { ok: true } or { ok: false, reason: 'gold' | 'cap' }
export function buyUnit(world, team, kind) {
  const cost = CONFIG.UNIT_STATS[kind].cost;
  if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' };
  if (getUnitCount(world, team) + countQueued(world, team, 'unit') >= getCap(world, team)) {
    return { ok: false, reason: 'cap' };
  }

  world.teams[team].gold -= cost;
  enqueue(world, team, 'unit', kind);
  return { ok: true };
}

// { ok: true } or { ok: false, reason: 'gold' | 'heroAlive' | 'heroCooldown' }
export function buyHero(world, team, kind) {
  if (hasLivingOrQueuedHero(world, team)) return { ok: false, reason: 'heroAlive' };
  if (world.teams[team].heroCooldownTimer > 0) return { ok: false, reason: 'heroCooldown' };

  const cost = getHeroCost(world, team);
  if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' };

  world.teams[team].gold -= cost;
  enqueue(world, team, 'hero', kind);
  return { ok: true };
}

// { ok: true } or { ok: false, reason: 'gold' | 'maxStructures' }
export function buyStructure(world, team) {
  if (livingStructures(world, team).length + countQueued(world, team, 'structure') >= CONFIG.MAX_STRUCTURES) {
    return { ok: false, reason: 'maxStructures' };
  }
  if (!canAfford(world, team, CONFIG.STRUCTURE_COST)) return { ok: false, reason: 'gold' };

  world.teams[team].gold -= CONFIG.STRUCTURE_COST;
  enqueue(world, team, 'structure', null);
  return { ok: true };
}
