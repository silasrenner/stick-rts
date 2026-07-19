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
  CAMERA_ZOOM: 0.7, // S8: render-time scale only — sim stays in unscaled world px. <1 shows more battlefield at once.

  AI_SIGHT_RANGE: 260, // px; how close an AI unit must be to see an enemy for scouting purposes

  DEATH_DURATION: 0.5, // seconds a unit spends toppling before removal
  ATTACK_ANIM_DURATION: 0.18, // seconds the attack lunge pose holds
  PROJECTILE_ARC_HEIGHT: 40, // px

  STARTING_GOLD: 300,
  BASE_UNIT_CAP: 15, // S8: cap rework — 15 + 5*13 = 80 max, under the 100-unit stress target
  MINER_BUILD_TIME: 5, // seconds
  WARRIOR_BUILD_TIME: 10,
  ARCHER_BUILD_TIME: 12,
  STRUCTURE_BUILD_TIME: 20,
  HERO_BUILD_TIME: 30, // independent of HERO_RESPAWN_COOLDOWN below — see sim/systems/production.js

  STRUCTURE_COST: 300, // S8: doubled from 150
  STRUCTURE_CAP_BONUS: 13, // S8: raised from 6 — see BASE_UNIT_CAP
  MAX_STRUCTURES: 5,
  STRUCTURE_HP: 150,
  STRUCTURE_DESTROY_DURATION: 0.4, // seconds a destroyed structure fades before removal
  STRUCTURE_SLOT_OFFSETS: [40, 80, 120, 160, 200], // px from homeX, toward the battlefield

  STATUE_HP: 2000,
  STATUE_WARNING_DURATION: 3, // seconds the "statue under attack" signal stays lit after the last hit
  MINE_OFFSET: 240, // px from homeX, toward the battlefield, past the last structure slot
  MINE_SLOTS: 4,
  MINE_CYCLE_TIME: 3, // seconds to extract one load
  GOLD_PER_TRIP: 25,
  MINER_ARRIVE_THRESHOLD: 4, // px

  // S7 formation system (sim/systems/formation.js): deterministic per-unit
  // slot assignment so groups read as ranks/files, not stacked blobs.
  DEFEND_SCREEN_OFFSET: 300, // px from homeX, toward the battlefield — past MINE_OFFSET so miners stay behind the line
  FORMATION_SLOT_SPACING_X: 50, // px between successive columns, and between the warrior/archer lines
  FORMATION_SLOT_SPACING_Y: 40, // px between file positions within one rank
  FORMATION_SLOTS_PER_RANK: 6, // unit count before a rank overflows into a new column
  FORMATION_Y_BAND: 200, // px of vertical spread a full rank occupies — (SLOTS_PER_RANK - 1) * SPACING_Y, fits within GROUND_Y's ~240px of headroom above the HUD
  ARCHER_COHESION_DISTANCE: 150, // px — archers under Defend hold rather than advance ahead of/without a warrior escort this close

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
      speed: 80, // S7: bumped from 70 — still slower than warrior's 90, closes the gap a bit
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
