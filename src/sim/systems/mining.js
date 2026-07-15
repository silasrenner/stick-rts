import { CONFIG } from '../../config.js';

// Runs before movement: decides/advances each miner's toMine -> mining ->
// toBase -> toMine cycle. Movement.js reads the resulting miningState via
// getMinerDesiredX to know where to walk (unless a threat overrides it).
export function updateMining(world, dt) {
  for (const unit of world.units) {
    if (!unit.isMiner || unit.state === 'dying') continue;

    const mine = world.mines[unit.team];
    const statue = world.statues[unit.team];

    if (unit.miningState === 'mining') {
      unit.mineTimer -= dt;
      if (unit.mineTimer <= 0) {
        unit.carrying = CONFIG.GOLD_PER_TRIP;
        unit.miningState = 'toBase';
      }
    } else if (unit.miningState === 'toBase') {
      if (Math.abs(unit.x - statue.x) <= CONFIG.MINER_ARRIVE_THRESHOLD) {
        world.teams[unit.team].gold += unit.carrying;
        unit.carrying = 0;
        unit.miningState = 'toMine';
      }
    } else {
      // 'toMine' (also the safe default for any unexpected value)
      unit.miningState = 'toMine';
      if (Math.abs(unit.x - mine.x) <= CONFIG.MINER_ARRIVE_THRESHOLD) {
        const miningCount = world.units.filter(
          (u) => u.isMiner && u.team === unit.team && u.miningState === 'mining' && u.state !== 'dying'
        ).length;
        if (miningCount < mine.slots) {
          unit.miningState = 'mining';
          unit.mineTimer = CONFIG.MINE_CYCLE_TIME;
        }
      }
    }
  }
}

export function getMinerDesiredX(unit, world) {
  if (unit.miningState === 'mining') return { desiredX: unit.x, holding: true };
  if (unit.miningState === 'toBase') return { desiredX: world.statues[unit.team].x, holding: false };
  return { desiredX: world.mines[unit.team].x, holding: false };
}
