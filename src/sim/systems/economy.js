import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { getCap, livingStructures, livingTurrets } from './supply.js';

export function canAfford(world, team, cost) { return world.teams[team].gold >= cost; }
export function getUnitCount(world, team) { return world.units.filter((u) => u.team === team && !u.isHero && isAliveEntity(u)).length; }
export function hasLivingHero(world, team) { return world.units.some((u) => u.team === team && u.isHero && isAliveEntity(u)); }
export function getHeroCost(world, team) { return Math.round(CONFIG.BASE_HERO_COST * CONFIG.HERO_COST_MULTIPLIER ** world.teams[team].heroDeathCount); }
export function countQueued(world, team, action) { return world.teams[team].productionQueue.filter((item) => item.action === action).length; }
export function hasLivingOrQueuedHero(world, team) { return hasLivingHero(world, team) || countQueued(world, team, 'hero') > 0; }
function getBuildTime(action, kind) { if (action === 'structure') return CONFIG.STRUCTURE_BUILD_TIME; if (action === 'turret') return CONFIG.TURRET_BUILD_TIME; if (action === 'hero') return CONFIG.HERO_BUILD_TIME; if (kind === 'miner') return CONFIG.MINER_BUILD_TIME; if (kind === 'warrior') return CONFIG.WARRIOR_BUILD_TIME; return CONFIG.ARCHER_BUILD_TIME; }
function enqueue(world, team, action, kind) { const total = getBuildTime(action, kind); world.teams[team].productionQueue.push({ action, kind, remaining: total, total }); }
function occupiedCap(world, team) { return getUnitCount(world, team) + countQueued(world, team, 'unit') + (livingTurrets(world, team).filter((turret) => !turret.isStartingTurret).length + countQueued(world, team, 'turret')) * CONFIG.TURRET_POPULATION_COST; }
function spend(world, team, cost) { world.teams[team].gold -= cost; world.teams[team].goldSpent += cost; }
export function buyUnit(world, team, kind) { const cost = CONFIG.UNIT_STATS[kind].cost; if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' }; if (occupiedCap(world, team) + 1 > getCap(world, team)) return { ok: false, reason: 'cap' }; spend(world, team, cost); enqueue(world, team, 'unit', kind); return { ok: true }; }
export function buyHero(world, team, kind) { if (hasLivingOrQueuedHero(world, team)) return { ok: false, reason: 'heroAlive' }; if (world.teams[team].heroCooldownTimer > 0) return { ok: false, reason: 'heroCooldown' }; const cost = getHeroCost(world, team); if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' }; spend(world, team, cost); enqueue(world, team, 'hero', kind); return { ok: true }; }
export function buyTurret(world, team) { if (livingTurrets(world, team).length + countQueued(world, team, 'turret') >= CONFIG.MAX_TURRETS) return { ok: false, reason: 'maxTurrets' }; if (!canAfford(world, team, CONFIG.TURRET_COST)) return { ok: false, reason: 'gold' }; if (occupiedCap(world, team) + CONFIG.TURRET_POPULATION_COST > getCap(world, team)) return { ok: false, reason: 'cap' }; spend(world, team, CONFIG.TURRET_COST); enqueue(world, team, 'turret', null); return { ok: true }; }
export function buyStructure(world, team) { if (livingStructures(world, team).length + countQueued(world, team, 'structure') >= CONFIG.MAX_STRUCTURES) return { ok: false, reason: 'maxStructures' }; if (!canAfford(world, team, CONFIG.STRUCTURE_COST)) return { ok: false, reason: 'gold' }; spend(world, team, CONFIG.STRUCTURE_COST); enqueue(world, team, 'structure', null); return { ok: true }; }
