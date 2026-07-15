export const CONFIG = {
  TICK_HZ: 60,

  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,
  GROUND_Y: 440, // shared baseline for units, statues, structures, mines — leaves room below for legend/build menu

  WALK_ANIM_HZ: 2.2,
  IDLE_ANIM_HZ: 0.6,

  PLAYER_HOME_X: 60,
  AI_HOME_X: 900, // CANVAS_WIDTH - 60
  PLAYER_FLEE_X: 20,
  AI_FLEE_X: 940, // CANVAS_WIDTH - 20

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
};
