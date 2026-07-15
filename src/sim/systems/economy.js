import { CONFIG } from '../../config.js';
import { createUnit, createStructure, isAliveEntity } from '../world.js';
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

// { ok: true } or { ok: false, reason: 'gold' | 'cap' }
export function buyUnit(world, team, kind) {
  const cost = CONFIG.UNIT_STATS[kind].cost;
  if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' };
  if (getUnitCount(world, team) >= getCap(world, team)) return { ok: false, reason: 'cap' };

  world.teams[team].gold -= cost;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const y = CONFIG.GROUND_Y - (getUnitCount(world, team) % 4) * 30;
  const unit = createUnit(kind, team, homeX, y);
  unit.command = world.teams[team].command;
  world.units.push(unit);
  return { ok: true };
}

// { ok: true } or { ok: false, reason: 'gold' | 'heroAlive' | 'heroCooldown' }
export function buyHero(world, team, kind) {
  if (hasLivingHero(world, team)) return { ok: false, reason: 'heroAlive' };
  if (world.teams[team].heroCooldownTimer > 0) return { ok: false, reason: 'heroCooldown' };

  const cost = getHeroCost(world, team);
  if (!canAfford(world, team, cost)) return { ok: false, reason: 'gold' };

  world.teams[team].gold -= cost;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const y = CONFIG.GROUND_Y - (getUnitCount(world, team) % 4) * 30;
  const hero = createUnit(kind, team, homeX, y);
  hero.command = world.teams[team].command;
  world.units.push(hero);
  return { ok: true };
}

// { ok: true } or { ok: false, reason: 'gold' | 'maxStructures' }
export function buyStructure(world, team) {
  const slotIndex = livingStructures(world, team).length;
  if (slotIndex >= CONFIG.MAX_STRUCTURES) return { ok: false, reason: 'maxStructures' };
  if (!canAfford(world, team, CONFIG.STRUCTURE_COST)) return { ok: false, reason: 'gold' };

  world.teams[team].gold -= CONFIG.STRUCTURE_COST;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const sign = team === 'player' ? 1 : -1;
  const x = homeX + sign * CONFIG.STRUCTURE_SLOT_OFFSETS[slotIndex];
  world.structures.push(createStructure(team, x, CONFIG.GROUND_Y));
  return { ok: true };
}
