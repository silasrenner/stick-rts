export const CONFIG = {
  TICK_HZ: 60,

  VIEWPORT_WIDTH: 1400, // what the canvas element actually renders
  WORLD_WIDTH: 5000, // longer battlefield; travel and reinforcement time scale with this
  CANVAS_HEIGHT: 540,
  GROUND_Y: 440, // shared baseline for units, statues, structures, mines — leaves room below for legend/build menu

  WALK_ANIM_HZ: 2.2,
  IDLE_ANIM_HZ: 0.6,

  PLAYER_HOME_X: 100,
  AI_HOME_X: 4900, // WORLD_WIDTH - 100
  PLAYER_FLEE_X: 40,
  AI_FLEE_X: 4960, // WORLD_WIDTH - 40

  EDGE_SCROLL_MARGIN: 60, // px from viewport edge that triggers camera scroll
  EDGE_SCROLL_SPEED: 900, // px/s
  CAMERA_CULL_MARGIN: 100, // px beyond the viewport edge before an entity stops being drawn
  CAMERA_ZOOM: 0.7, // S8: render-time scale only — sim stays in unscaled world px. <1 shows more battlefield at once. S10: now just the starting value — camera.zoom is runtime state.
  CAMERA_ZOOM_MIN: 1400 / 5000, // VIEWPORT_WIDTH / WORLD_WIDTH — entire map at min zoom
  CAMERA_ZOOM_MAX: 1.4, // S10: 2x the starting zoom; tunable if it feels too tight/loose

  AI_SIGHT_RANGE: 260, // px; how close an AI unit must be to see an enemy for scouting purposes
  AI_DECISION_JITTER: 0.125, // S9: ±12.5% seed-derived variance on each team's decisionInterval reset
  // Assessment-only depth of the active combat front: combat units no more
  // than this far behind their team's forward-most combat unit are frontline.
  FRONTLINE_COMBAT_DEPTH: 420,

  // Team-vision sources are simulation-query owned but presentation-only for
  // now. They intentionally do not affect existing AI memory or combat.
  VISION_RANGES: {
    units: { miner: 260, warrior: 340, archer: 380 },
    hero: 420,
    core: 420,
    turret: 360,
    structure: 260,
  },
  SPECTATOR_FOG_ALPHA: 0.42,

  // Raven is a temporary, non-combat scouting action. It deliberately does
  // not use unit stats, population, formations, or the normal FIFO queue.
  RAVEN: {
    cost: 750,
    preparationTime: 2,
    movementSpeed: 560,
    movingVisionRadius: 300,
    enemyBaseRevealRadius: 800,
    revealDuration: 10,
    cooldown: 45,
    flightAltitude: 250,
    exitSpeed: 700,
    exitDistance: 350,
  },


  DEATH_DURATION: 0.5, // seconds a unit spends toppling before removal
  ATTACK_ANIM_DURATION: 0.18, // seconds the attack lunge pose holds
  PROJECTILE_ARC_HEIGHT: 40, // px

  STARTING_GOLD: 300,
  BASE_UNIT_CAP: 15, // S8: cap rework — 15 + 5*13 = 80 max, under the 100-unit stress target
  MINER_BUILD_TIME: 5, // seconds
  WARRIOR_BUILD_TIME: 10,
  ARCHER_BUILD_TIME: 12,
  STRUCTURE_BUILD_TIME: 20,
  // Keep hero systems and data preserved while temporarily removing the
  // feature from every player/AI purchase surface.
  HEROES_ENABLED: false,
  HERO_BUILD_TIME: 30, // independent of HERO_RESPAWN_COOLDOWN below — see sim/systems/production.js
  PRODUCTION_QUEUE_LIMIT: 10, // paid FIFO items per team; applies to all production kinds

  STRUCTURE_COST: 300, // S8: doubled from 150
  TURRET_COST: 600,
  TURRET_BUILD_TIME: 15,
  MAX_TURRETS: 4,
  TURRET_HP: 450,
  TURRET_DAMAGE: 47.6,
  TURRET_RANGE: 700,
  TURRET_ATTACK_COOLDOWN: 1.8,
  TURRET_PROJECTILE_SPEED: 320,
  STARTING_TURRET_OFFSET: 20,
  TURRET_SLOT_OFFSETS: [380, 900, 1420],
  HARD_TURRET_FIRST_TIME: 5.5 * 60,
  HARD_TURRET_SECOND_TIME: 13 * 60,
  HARD_TURRET_THIRD_TIME: 20 * 60,
  STRUCTURE_CAP_BONUS: 13,
  MAX_STRUCTURES: 5,
  STRUCTURE_HP: 200,
  STRUCTURE_DESTROY_DURATION: 0.4, // seconds a destroyed structure fades before removal
  STRUCTURE_SLOT_OFFSETS: [40, 80, 120, 160, 200], // px from homeX, toward the battlefield

  STATUE_HP: 2000,
  STATUE_WARNING_DURATION: 3, // seconds the "statue under attack" signal stays lit after the last hit
  MINE_OFFSET: 240, // px from homeX, toward the battlefield, past the last structure slot
  MINE_SLOTS: 4,
  MINE_CYCLE_TIME: 3, // seconds to extract one load
  GOLD_PER_TRIP: 23,
  UNIT_KILL_REWARD_RATE: 0.10, // killer receives 10% of a defeated unit's invested value
  MINER_ARRIVE_THRESHOLD: 4, // px

  // Warriors and archers distribute new/reacquired targets within an existing
  // priority tier. Heroes and turrets retain their ordinary nearest-target rule.
  TARGET_SATURATION: {
    multipliers: [1.00, 0.70, 0.40, 0.15], // 0, 1, 2, 3+ committed friendly warrior/archer attackers
    distanceWeight: 0.35,
  },

  // S7 formation system (sim/systems/formation.js): deterministic per-unit
  // slot assignment so groups read as ranks/files, not stacked blobs.
  DEFEND_SCREEN_OFFSET: 380, // legacy inner-turret reference; formation uses TURRET_SLOT_OFFSETS directly
  FORMATION_SLOT_SPACING_X: 60, // px between successive columns, and between the warrior/archer lines
  FORMATION_SLOT_SPACING_Y: 40, // px between file positions within one rank
  FORMATION_SLOTS_PER_RANK: 6, // unit count before a rank overflows into a new column
  FORMATION_Y_BAND: 200, // px of vertical spread a full rank occupies — (SLOTS_PER_RANK - 1) * SPACING_Y, fits within GROUND_Y's ~240px of headroom above the HUD
  ARCHER_COHESION_DISTANCE: 150, // px — archers under Defend hold rather than advance ahead of/without a warrior escort this close

  // S9 parallax background (render/parallax.js) — render-only, no sim impact.
  // Speeds are fractions of camera.x; farther/slower layers listed first.
  PARALLAX_LAYER_SPEEDS: [0.2, 0.5, 0.8],
  PARALLAX_MOUNTAIN_TILE_WIDTH: 400,
  PARALLAX_MOUNTAIN_HEIGHT: 90,
  PARALLAX_MOUNTAIN_BASE_Y: 160,
  PARALLAX_TREE_TILE_WIDTH: 150,
  PARALLAX_TREE_HEIGHT: 60,
  PARALLAX_TREE_BASE_Y: 300,
  PARALLAX_BUSH_TILE_WIDTH: 70,
  PARALLAX_BUSH_HEIGHT: 18,
  PARALLAX_BUSH_BASE_Y: 420,

  // S11 HUD/build-UI layout (render-only) — top strip, bottom build+queue
  // bar, glyph icons. Everything here is screen-space px; unaffected by
  // camera.zoom (UI draws post-restore, see renderer.js). HUD_PANEL_WIDTH
  // is fixed, not content-derived — the S10 bug was one unbounded-width
  // text line (the production queue listed inline); every top-strip row
  // must fit this width, and the queue itself moved to bounded chips below.
  HUD_PANEL_WIDTH: 230,
  HUD_GLYPH_SCALE: 0.22, // drawStickFigure() scale for army-count + chip icons
  BUILD_BUTTON_WIDTH: 120,
  BUILD_BUTTON_HEIGHT: 30,
  BUILD_BUTTON_GAP: 8,
  BUILD_BUTTON_MARGIN_BOTTOM: 6,
  BUILD_BUTTON_ICON_SCALE: 0.3,
  BUILD_PROGRESS_BAR_HEIGHT: 3,
  QUEUE_CHIP_WIDTH: 46,
  QUEUE_CHIP_HEIGHT: 28,
  QUEUE_CHIP_GAP: 4,
  BOTTOM_BAR_ROW_GAP: 4, // gap between the queue-chip row and the build-button row

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
      cost: 137.5,
      hp: 54.6,
      damage: 7.5,
      range: 22,
      attackCooldown: 0.5,
      speed: 90,
      acquireRange: 260,
      threatRange: 0,
      projectileSpeed: 0,
    },
    archer: {
      cost: 280,
      hp: 42,
      damage: 16,
      range: 520,
      attackCooldown: 1.5,
      speed: 90,
      acquireRange: 520,
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
