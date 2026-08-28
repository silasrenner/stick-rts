import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';

// Melee-ish kinds hold the outer/front line; ranged kinds hold the
// inner/back line, kept strictly behind it (see assignTeamSlots).
const BACK_LINE_KINDS = new Set(['archer', 'hawkeye']);

// Runs before movement.js each tick: assigns every living, non-miner,
// non-directly-controlled unit a deterministic (slotX, slotY) formation
// position. File order is unit.id ascending — never spawn/iteration order,
// never RNG — so replays and headless runs stay reproducible. Combat
// range/acquisition checks stay 1D (x-only, see supply.js) by design;
// these slots exist purely for pre-contact positioning (movement.js only
// reads them when a unit has no live combat target to approach directly).
// `unit.formationExempt` opts a unit out entirely (its slotX/slotY are
// simply never assigned) — used by main.js's debug stress-spawn tool,
// which pins units to their spawn point via homeX/enemyHomeX instead;
// movement.js's `unit.slotX ?? unit.homeX` fallback then resolves to
// that pin regardless of which command the team is currently under,
// surviving a live setTeamCommand call (which stomps unit.command on
// every unit of the team, but never touches homeX/enemyHomeX/slotX).
export function updateFormationSlots(world) {
  for (const team of ['player', 'ai']) {
    assignTeamSlots(world, team);
  }
}

function assignTeamSlots(world, team) {
  const sign = team === 'player' ? 1 : -1;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const enemyHomeX = team === 'player' ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
  const command = world.teams[team].command;

  const eligible = world.units
    .filter(
      (u) => u.team === team && isAliveEntity(u) && !u.isMiner && !(u.isHero && u.controlled) && !u.formationExempt
    )
    .sort((a, b) => a.id - b.id);

  const frontLine = eligible.filter((u) => !BACK_LINE_KINDS.has(u.kind));
  const backLine = eligible.filter((u) => BACK_LINE_KINDS.has(u.kind));

  const targetAnchor = world.teams[team].commanderTargetAnchor;
  let anchorX;
  let growthSign;
  if (targetAnchor && command !== 'retreat') {
    // Commander anchors are a bounded contract, computed from real map
    // geometry at plan acceptance. The formation executes that exact target;
    // it never replaces it with a generic core-push or defense position.
    anchorX = targetAnchor.x;
    growthSign = command === 'attack' ? -sign : sign;
  } else if (command === 'attack') {
    // Marching toward the enemy: overflow columns trail the lead group
    // toward home rather than overtaking it.
    anchorX = enemyHomeX;
    growthSign = -sign;
  } else {
    // Defend (and retreat, though retreat doesn't consult slots — see
    // movement.js): a screening line past the mine zone, toward the
    // enemy. Overflow columns thicken the guard line outward, toward the
    // enemy, per the confirmed multi-column direction.
    const anchorIndex = Math.min(world.teams[team].defendAnchorIndex ?? 0, CONFIG.TURRET_SLOT_OFFSETS.length - 1);
    anchorX = homeX + sign * CONFIG.TURRET_SLOT_OFFSETS[anchorIndex];
    growthSign = sign;
  }

  assignLine(frontLine, anchorX, growthSign);

  // Archers always sit strictly behind (less exposed toward the enemy
  // than) every front-line position this tick, and their own overflow
  // columns extend further behind still — never toward home *or* toward
  // the enemy, since either of those can catch up to a front-line column
  // once both lines grow past one rank. `sign * x` is a position's
  // "exposure" (larger = more toward the enemy); anchoring the back line
  // one spacing step beyond the front line's *least*-exposed occupied
  // column, then always growing further in the -sign direction from
  // there, guarantees zero collision for any front/back column count —
  // the two lines occupy strictly disjoint halves of the x-axis around
  // that point, regardless of which direction the front line itself grew.
  const frontMinExposure = frontLine.length > 0 ? Math.min(...frontLine.map((u) => sign * u.slotX)) : sign * anchorX;
  const backAnchorX = sign * (frontMinExposure - CONFIG.FORMATION_SLOT_SPACING_X);
  assignLine(backLine, backAnchorX, -sign);
}

function assignLine(units, lineAnchorX, growthSign) {
  const perRank = CONFIG.FORMATION_SLOTS_PER_RANK;

  units.forEach((unit, index) => {
    const column = Math.floor(index / perRank);
    const file = index % perRank;

    unit.slotX = lineAnchorX + growthSign * column * CONFIG.FORMATION_SLOT_SPACING_X;
    unit.slotY = CONFIG.GROUND_Y - file * CONFIG.FORMATION_SLOT_SPACING_Y;
  });
}
