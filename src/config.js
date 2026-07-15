export const CONFIG = {
  TICK_HZ: 60,

  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,

  WALK_ANIM_HZ: 2.2,
  IDLE_ANIM_HZ: 0.6,

  PLAYER_HOME_X: 60,
  AI_HOME_X: 900, // CANVAS_WIDTH - 60
  PLAYER_FLEE_X: 20,
  AI_FLEE_X: 940, // CANVAS_WIDTH - 20

  DEATH_DURATION: 0.5, // seconds a unit spends toppling before removal
  ATTACK_ANIM_DURATION: 0.18, // seconds the attack lunge pose holds
  PROJECTILE_ARC_HEIGHT: 40, // px

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
