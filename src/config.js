export const CONFIG = {
  TICK_HZ: 60,

  VIEWPORT_WIDTH: 1400, // what the canvas element actually renders
  WORLD_WIDTH: 7000, // total battlefield; viewport is ~20% of it (brief's 10-30% range) — final ratio tuned in S6
  CANVAS_HEIGHT: 540,
  GROUND_Y: 440, // shared baseline for units, statues, structures, mines — leaves room below for legend/build menu

  WALK_ANIM_HZ: 2.2,
  IDLE_ANIM_HZ: 0.6,

  PLAYER_HOME_X: 100,
  AI_HOME_X: 6900, // WORLD_WIDTH - 100
  PLAYER_FLEE_X: 40,
  AI_FLEE_X: 6960, // WORLD_WIDTH - 40

  EDGE_SCROLL_MARGIN: 60, // px from viewport edge that triggers camera scroll
  EDGE_SCROLL_SPEED: 900, // px/s
  CAMERA_CULL_MARGIN: 100, // px beyond the viewport edge before an entity stops being drawn

  DEATH_DURATION: 0.5, // seconds a unit spends toppling before removal
  ATTACK_ANIM_DURATION: 0.18, // seconds the attack lunge pose holds
  PROJECTILE_ARC_HEIGHT: 40, // px

  STARTING_GOLD: 300,
  BASE_UNIT_CAP: 10,

  STRUCTURE_COST: 150,
  STRUCTURE_CAP_BONUS: 6,
  MAX_STRUCTURES: 5,
  STRUCTURE_HP: 150,
  STRUCTURE_DESTROY_DURATION: 0.4, // seconds a destroyed structure fades before removal
  STRUCTURE_SLOT_OFFSETS: [40, 80, 120, 160, 200], // px from homeX, toward the battlefield

  STATUE_HP: 2000,
  MINE_OFFSET: 240, // px from homeX, toward the battlefield, past the last structure slot
  MINE_SLOTS: 4,
  MINE_CYCLE_TIME: 3, // seconds to extract one load
  GOLD_PER_TRIP: 25,
  MINER_ARRIVE_THRESHOLD: 4, // px

  BASE_HERO_COST: 600,
  HERO_COST_MULTIPLIER: 1.5, // per death
  HERO_RESPAWN_COOLDOWN: 30, // seconds

  FORGEMASTER_MINE_MULTIPLIER: 3,
  FORGEMASTER_AURA_RANGE: 150,
  FORGEMASTER_AURA_BONUS: 0.15, // attack-speed bonus for nearby allies
  FORGEMASTER_KNOCKBACK: 20, // px, pushes a melee attacker back on hit

  HAWKEYE_SPECIAL_COOLDOWN: 8,
  HAWKEYE_SPECIAL_DAMAGE: 30,

  VANGUARD_SPECIAL_COOLDOWN: 6,
  VANGUARD_CHARGE_DISTANCE: 150, // px

  UNIT_STATS: {
    miner: {
      cost: 100,
      hp: 40,
      damage: 0,
      range: 0,
      attackCooldown: 0,
      speed: 80,
      acquireRange: 0,
      threatRange: 150,
      projectileSpeed: 0,
    },
    warrior: {
      cost: 125,
      hp: 60,
      damage: 10,
      range: 22,
      attackCooldown: 0.5,
      speed: 90,
      acquireRange: 260,
      threatRange: 0,
      projectileSpeed: 0,
    },
    archer: {
      cost: 250,
      hp: 35,
      damage: 14,
      range: 220,
      attackCooldown: 1.0,
      speed: 70,
      acquireRange: 300,
      threatRange: 0,
      projectileSpeed: 300,
    },
  },

  HERO_STATS: {
    forgemaster: {
      hp: 150,
      damage: 4,
      range: 22,
      attackCooldown: 1.0,
      speed: 70,
      acquireRange: 200,
      threatRange: 0,
      projectileSpeed: 0,
    },
    hawkeye: {
      hp: 90,
      damage: 22,
      range: 320,
      attackCooldown: 0.9,
      speed: 75,
      acquireRange: 340,
      threatRange: 0,
      projectileSpeed: 320,
    },
    vanguard: {
      hp: 160,
      damage: 16,
      range: 26,
      attackCooldown: 0.6,
      speed: 85,
      acquireRange: 260,
      threatRange: 0,
      projectileSpeed: 0,
    },
  },
};
