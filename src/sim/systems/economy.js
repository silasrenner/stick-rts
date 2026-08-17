import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { getCap, livingStructures, livingTurrets } from './supply.js';

export function canAfford(world, team, cost) { return world.teams[team].gold >= cost; }
export function getUnitCount(world, team) { return world.units.filter((u) => u.team === team && !u.isHero && isAliveEntity(u)).length; }
export function hasLivingHero(world, team) { return world.units.some((u) => u.team === team && u.isHero && isAliveEntity(u)); }
export function getHeroCost(world, team) { return Math.round(CONFIG.BASE_HERO_COST * CONFIG.HERO_COST_MULTIPLIER ** world.teams[team].heroDeathCount); }
export function countQueued(world, team, action) { return world.teams[team].productionQueue.filter((item) => item.action === action).length; }
export function hasLivingOrQueuedHero(world, team) { return hasLivingHero(world, team) || countQueued(world, team, 'hero') > 0; }

function getBuildTime(action, kind) {
  if (action === 'structure') return CONFIG.STRUCTURE_BUILD_TIME;
  if (action === 'turret') return CONFIG.TURRET_BUILD_TIME;
  if (action === 'hero') return CONFIG.HERO_BUILD_TIME;
  if (kind === 'miner') return CONFIG.MINER_BUILD_TIME;
  if (kind === 'warrior') return CONFIG.WARRIOR_BUILD_TIME;
  return CONFIG.ARCHER_BUILD_TIME;
}

function enqueue(world, team, action, kind) {
  const total = getBuildTime(action, kind);
  world.teams[team].productionQueue.push({ action, kind, remaining: total, total });
}

function queueHasCapacity(world, team) { return world.teams[team].productionQueue.length < CONFIG.PRODUCTION_QUEUE_LIMIT; }
function occupiedCap(world, team) {
  return getUnitCount(world, team)
    + countQueued(world, team, 'unit')
    + (livingTurrets(world, team).filter((turret) => !turret.isStartingTurret).length + countQueued(world, team, 'turret')) * CONFIG.TURRET_POPULATION_COST;
}
function spend(world, team, cost) { world.teams[team].gold -= cost; world.teams[team].goldSpent += cost; }

function feasible() { return { feasible: true, reason: null }; }
function infeasible(reason) { return { feasible: false, reason }; }

// Read-only legality seam used by AI observability. The purchase APIs below
// call this same function before spending/enqueuing, so candidate inspection
// cannot drift from the rules that execute a real purchase.
export function getPurchaseFeasibility(world, team, candidate) {
  const { action, kind = null } = candidate ?? {};
  if (!queueHasCapacity(world, team)) return infeasible('queueFull');

  if (action === 'unit') {
    const stats = CONFIG.UNIT_STATS[kind];
    if (!stats) return infeasible('invalidKind');
    if (!canAfford(world, team, stats.cost)) return infeasible('gold');
    if (occupiedCap(world, team) + 1 > getCap(world, team)) return infeasible('cap');
    return feasible();
  }

  if (action === 'hero') {
    if (!CONFIG.HERO_STATS[kind]) return infeasible('invalidKind');
    if (hasLivingOrQueuedHero(world, team)) return infeasible('heroAlive');
    if (world.teams[team].heroCooldownTimer > 0) return infeasible('heroCooldown');
    if (!canAfford(world, team, getHeroCost(world, team))) return infeasible('gold');
    return feasible();
  }

  if (action === 'turret') {
    if (livingTurrets(world, team).length + countQueued(world, team, 'turret') >= CONFIG.MAX_TURRETS) return infeasible('maxTurrets');
    if (!canAfford(world, team, CONFIG.TURRET_COST)) return infeasible('gold');
    if (occupiedCap(world, team) + CONFIG.TURRET_POPULATION_COST > getCap(world, team)) return infeasible('cap');
    return feasible();
  }

  if (action === 'structure') {
    if (livingStructures(world, team).length + countQueued(world, team, 'structure') >= CONFIG.MAX_STRUCTURES) return infeasible('maxStructures');
    if (!canAfford(world, team, CONFIG.STRUCTURE_COST)) return infeasible('gold');
    return feasible();
  }

  return infeasible('invalidAction');
}

function purchaseResult(feasibility) {
  return feasibility.feasible ? { ok: true } : { ok: false, reason: feasibility.reason };
}

export function buyUnit(world, team, kind) {
  const feasibility = getPurchaseFeasibility(world, team, { action: 'unit', kind });
  if (!feasibility.feasible) return purchaseResult(feasibility);
  spend(world, team, CONFIG.UNIT_STATS[kind].cost);
  enqueue(world, team, 'unit', kind);
  return { ok: true };
}

export function buyHero(world, team, kind) {
  const feasibility = getPurchaseFeasibility(world, team, { action: 'hero', kind });
  if (!feasibility.feasible) return purchaseResult(feasibility);
  spend(world, team, getHeroCost(world, team));
  enqueue(world, team, 'hero', kind);
  return { ok: true };
}

export function buyTurret(world, team) {
  const feasibility = getPurchaseFeasibility(world, team, { action: 'turret' });
  if (!feasibility.feasible) return purchaseResult(feasibility);
  spend(world, team, CONFIG.TURRET_COST);
  enqueue(world, team, 'turret', null);
  return { ok: true };
}

export function buyStructure(world, team) {
  const feasibility = getPurchaseFeasibility(world, team, { action: 'structure' });
  if (!feasibility.feasible) return purchaseResult(feasibility);
  spend(world, team, CONFIG.STRUCTURE_COST);
  enqueue(world, team, 'structure', null);
  return { ok: true };
}
