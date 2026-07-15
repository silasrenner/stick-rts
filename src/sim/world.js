import { CONFIG } from '../config.js';

let nextId = 1;

export function createWorld() {
  return {
    units: [],
    projectiles: [],
  };
}

export function createUnit(kind, team, x, y) {
  const stats = CONFIG.UNIT_STATS[kind];
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
    isMiner: kind === 'miner',

    homeX,
    enemyHomeX,
    fleeX,
    command: 'defend',
    targetId: null,

    attackAnimTimer: 0,
    deathTimer: 0,
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

// Nearest living enemy unit within range, or null.
export function findNearestEnemyWithin(world, unit, range) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const other of world.units) {
    if (other.team === unit.team || other.state === 'dying') continue;
    const dist = Math.abs(other.x - unit.x);
    if (dist <= range && dist < nearestDist) {
      nearest = other;
      nearestDist = dist;
    }
  }
  return nearest;
}
