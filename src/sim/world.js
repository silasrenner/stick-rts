import { CONFIG } from '../config.js';

let nextId = 1;

export function createWorld() {
  return {
    units: [],
    projectiles: [],
    structures: [],
    teams: {
      player: { gold: CONFIG.STARTING_GOLD, command: 'defend', heroDeathCount: 0, heroCooldownTimer: 0 },
      ai: { gold: CONFIG.STARTING_GOLD, command: 'defend', heroDeathCount: 0, heroCooldownTimer: 0 },
    },
    mines: {
      player: { x: CONFIG.PLAYER_HOME_X + CONFIG.MINE_OFFSET, y: CONFIG.GROUND_Y, slots: CONFIG.MINE_SLOTS },
      ai: { x: CONFIG.AI_HOME_X - CONFIG.MINE_OFFSET, y: CONFIG.GROUND_Y, slots: CONFIG.MINE_SLOTS },
    },
    statues: {
      player: createStatue('player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y),
      ai: createStatue('ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y),
    },
    matchState: 'playing',
  };
}

export function createUnit(kind, team, x, y) {
  const isHero = CONFIG.HERO_STATS[kind] !== undefined;
  const stats = isHero ? CONFIG.HERO_STATS[kind] : CONFIG.UNIT_STATS[kind];
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const enemyHomeX = team === 'player' ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
  const fleeX = team === 'player' ? CONFIG.PLAYER_FLEE_X : CONFIG.AI_FLEE_X;

  return {
    id: nextId++,
    kind,
    team,
    x,
    y,
    facing: team === 'player' ? 1 : -1,
    state: 'idle',
    animPhase: 0,

    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    range: stats.range,
    attackCooldown: stats.attackCooldown,
    attackTimer: 0,
    acquireRange: stats.acquireRange,
    threatRange: stats.threatRange,
    speed: stats.speed,
    projectileSpeed: stats.projectileSpeed,
    isMiner: kind === 'miner', // never fights, flees on threat
    minesGold: kind === 'miner' || kind === 'forgemaster', // works the mine cycle; forgemaster still fights back
    isHero,
    controlled: false,
    specialTimer: 0,

    homeX,
    enemyHomeX,
    fleeX,
    command: 'defend',
    targetId: null,

    attackAnimTimer: 0,
    deathTimer: 0,

    // mining (miners only, but harmless as unused fields on other kinds)
    miningState: 'toMine',
    mineTimer: 0,
    carrying: 0,
  };
}

export function createStructure(team, x, y) {
  return {
    id: nextId++,
    kind: 'structure',
    team,
    x,
    y,
    hp: CONFIG.STRUCTURE_HP,
    maxHp: CONFIG.STRUCTURE_HP,
    state: 'standing',
    destroyTimer: 0,
    isStructure: true,
  };
}

export function createStatue(team, x, y) {
  return {
    id: nextId++,
    kind: 'statue',
    team,
    x,
    y,
    hp: CONFIG.STATUE_HP,
    maxHp: CONFIG.STATUE_HP,
    state: 'standing',
    isStatue: true,
  };
}

export function createProjectile(team, x, y, targetX, targetY, targetId, damage, speed) {
  const dist = Math.hypot(targetX - x, targetY - y);
  return {
    id: nextId++,
    team,
    startX: x,
    startY: y,
    targetX,
    targetY,
    targetId,
    damage,
    duration: Math.max(0.05, dist / speed),
    elapsed: 0,
  };
}

// True for units not toppling and structures/statues not destroyed.
export function isAliveEntity(entity) {
  return !!entity && entity.state !== 'dying' && entity.state !== 'destroyed';
}

export function findEntityById(world, id) {
  return (
    world.units.find((u) => u.id === id) ??
    world.structures.find((s) => s.id === id) ??
    Object.values(world.statues).find((s) => s.id === id) ??
    null
  );
}

// All living enemy units within range (for cleave/piercing effects).
export function findAllEnemiesWithin(world, unit, range) {
  return world.units.filter((other) => other.team !== unit.team && isAliveEntity(other) && Math.abs(other.x - unit.x) <= range);
}

// Nearest living enemy unit within range, or null.
export function findNearestEnemyWithin(world, unit, range) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const other of world.units) {
    if (other.team === unit.team || !isAliveEntity(other)) continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist <= range && dist < nearestDist) {
      nearest = other;
      nearestDist = dist;
    }
  }
  return nearest;
}
