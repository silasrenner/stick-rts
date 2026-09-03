import { CONFIG } from '../config.js';
import { createRng } from './rng.js';

let nextId = 1;

// Each field retains the old team-wide worker ceiling while presenting three
// small deposits. `direction` preserves a mirrored left/right ordering.
function createMineField(centerX, y, direction) {
  return {
    slots: CONFIG.MINE_SLOTS,
    deposits: [-1, 0, 1].map((offset) => ({ x: centerX + direction * offset * CONFIG.MINE_DEPOSIT_SPACING, y })),
  };
}

// Each team gets its own RNG stream, derived from one master seed but never
// sharing a draw counter — same seed reproduces an identical trace for both
// teams regardless of which team's decision timer happens to elapse first
// on a given tick (see sim/ai/behavior.js's jitter consumer).
export function createWorld(seed = Date.now()) {
  const masterRng = createRng(seed);
  const playerRng = createRng(masterRng.next() * 2 ** 32);
  const aiRng = createRng(masterRng.next() * 2 ** 32);

  return {
    units: [],
    projectiles: [],
    // Temporary non-combat scouting assets. Ravens never enter units so they
    // cannot affect population, combat, formations, or AI army assessment.
    ravens: [],
    structures: [
      { ...createTurret('player', CONFIG.PLAYER_HOME_X + CONFIG.STARTING_TURRET_OFFSET, CONFIG.GROUND_Y), isStartingTurret: true },
      { ...createTurret('ai', CONFIG.AI_HOME_X - CONFIG.STARTING_TURRET_OFFSET, CONFIG.GROUND_Y), isStartingTurret: true },
    ],
    teams: {
      player: {
        gold: CONFIG.STARTING_GOLD,
        goldSpent: 0,
        losses: 0,
                command: 'defend',
        defendAnchorIndex: 0, // first buildable turret, closest to the mine
        defendCycleStarted: false, // first Player Defend confirms inner; later presses advance outward
        heroDeathCount: 0,
        heroCooldownTimer: 0,
        statueWarningTimer: 0,
        difficulty: null, // null = human-controlled; the AI behavior tree skips any team with no difficulty set
        decisionTimer: 0,
        buildIndex: 0,
        recovering: false, // Hard uses this after a committed combat force is wiped.
        strategicGoal: null, // Latest explicit AI intent; command remains a separate simulation posture.
        lastAiDecision: null, // Latest bounded explanation record; never participates in simulation rules.
        productionQueue: [], // S8: sequential FIFO — see sim/systems/production.js
        ravenCooldownTimer: 0, // Raven is a separate temporary scouting action, not queue production.
        rng: playerRng,
      },
      ai: {
        gold: CONFIG.STARTING_GOLD,
        goldSpent: 0,
        losses: 0,
                command: 'defend',
        defendAnchorIndex: 0, // first buildable turret, closest to the mine
        defendCycleStarted: false, // first Player Defend confirms inner; later presses advance outward
        heroDeathCount: 0,
        heroCooldownTimer: 0,
        statueWarningTimer: 0,
        difficulty: null,
        decisionTimer: 0,
        buildIndex: 0,
        recovering: false,
        strategicGoal: null,
        lastAiDecision: null,
        productionQueue: [],
        ravenCooldownTimer: 0,
        rng: aiRng,
      },
    },
    mines: {
      player: createMineField(CONFIG.PLAYER_HOME_X + CONFIG.MINE_OFFSET, CONFIG.GROUND_Y, 1),
      ai: createMineField(CONFIG.AI_HOME_X - CONFIG.MINE_OFFSET, CONFIG.GROUND_Y, -1),
    },
    statues: {
      player: createStatue('player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y),
      ai: createStatue('ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y),
    },
    matchState: 'menu',
    matchElapsedTime: 0,
    // Presentation telemetry sampled by simulation time; never read by rules or AI.
    goldHistory: { nextSampleAt: 0, samples: [] },
    // Optional temporary/non-entity sources consumed only by sim/vision.js.
    // Empty by default; future reveals can add { team, x, y, radius, active }.
    visionSources: [],
    aiMemory: {},
  };
}

// Mining remains a core-owned economic action, but its materialized workers
// use a clear delivery lane beyond the starting turret rather than standing
// inside the core/turret artwork every trip.
export function getCoreDeliveryX(team) {
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const sign = team === 'player' ? 1 : -1;
  return homeX + sign * CONFIG.MINER_CORE_DELIVERY_OFFSET;
}

// Watch AI mode: both teams are AI-controlled (a normal PvE match only ever
// sets the 'ai' team's difficulty, never 'player's). Single source of truth
// reused by camera/main/ui to gate input suppression and free-pan.
export function isWatchAiMatch(world) {
  return world.teams.player.difficulty !== null && world.teams.ai.difficulty !== null;
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
    goldValue: isHero ? CONFIG.BASE_HERO_COST : stats.cost,
    range: stats.range,
    attackCooldown: stats.attackCooldown,
    attackTimer: 0,
    acquireRange: stats.acquireRange,
    threatRange: stats.threatRange,
    speed: stats.speed,
    projectileSpeed: stats.projectileSpeed,
    projectileRadius: stats.projectileRadius ?? 3,
    splashRadius: stats.splashRadius ?? 0,
    splashDamage: stats.splashDamage ?? 0,
    staticDamageMultiplier: stats.staticDamageMultiplier ?? 1,
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
    mineDepositIndex: null, // stable chosen deposit for the current home → mine → home trip
    mineTimer: 0,
    carrying: 0,
  };
}

export function createRaven(team) {
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const enemyHomeX = team === 'player' ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
  return {
    id: nextId++,
    team,
    x: homeX,
    y: CONFIG.GROUND_Y - CONFIG.RAVEN.flightAltitude,
    direction: team === 'player' ? 1 : -1,
    enemyHomeX,
    state: 'preparing',
    preparationRemaining: CONFIG.RAVEN.preparationTime,
    revealRemaining: 0,
  };
}

export function createTurret(team, x, y) {
  return { id: nextId++, team, x, y, isStructure: true, isTurret: true, state: 'idle', hp: CONFIG.TURRET_HP, maxHp: CONFIG.TURRET_HP, range: CONFIG.TURRET_RANGE, acquireRange: CONFIG.TURRET_RANGE, damage: CONFIG.TURRET_DAMAGE, attackCooldown: CONFIG.TURRET_ATTACK_COOLDOWN, attackTimer: 0, attackAnimTimer: 0, projectileSpeed: CONFIG.TURRET_PROJECTILE_SPEED, targetId: null };
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

export function createProjectile(team, x, y, targetX, targetY, targetId, damage, speed, impact = null, radius = 3) {
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
    impact,
    radius,
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
