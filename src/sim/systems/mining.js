import { CONFIG } from '../../config.js';
import { getCoreDeliveryX } from '../world.js';

function assignMineDeposits(world) {
  for (const team of ['player', 'ai']) {
    const mineField = world.mines[team];
    const commitments = mineField.deposits.map(() => 0);
    const unassigned = [];

    for (const unit of world.units) {
      if (!unit.minesGold || unit.team !== team || unit.state === 'dying') continue;
      if (Number.isInteger(unit.mineDepositIndex) && mineField.deposits[unit.mineDepositIndex]) commitments[unit.mineDepositIndex] += 1;
      else unassigned.push(unit);
    }

    // Stable ID order makes allocation independent of incidental world.units ordering.
    for (const unit of unassigned.sort((a, b) => a.id - b.id)) {
      const lowestCommitment = Math.min(...commitments);
      const depositIndex = commitments.findIndex((count) => count === lowestCommitment);
      unit.mineDepositIndex = depositIndex;
      commitments[depositIndex] += 1;
    }
  }
}

function assignedDeposit(world, unit) {
  const deposits = world.mines[unit.team].deposits;
  return deposits[unit.mineDepositIndex] ?? deposits[1];
}

// Runs before movement: decides/advances each gold-mining unit's toMine ->
// mining -> toBase -> toMine cycle. Movement.js reads the resulting
// miningState via getMinerDesiredX to know where to walk (unless a miner's
// threat-flee override, or a forgemaster's combat target, takes priority).
export function updateMining(world, dt) {
  assignMineDeposits(world);

  for (const unit of world.units) {
    if (!unit.minesGold || unit.state === 'dying') continue;

    const mineField = world.mines[unit.team];
    const deposit = assignedDeposit(world, unit);
    const deliveryX = getCoreDeliveryX(unit.team);

    if (unit.miningState === 'mining') {
      unit.mineTimer -= dt;
      if (unit.mineTimer <= 0) {
        const multiplier = unit.kind === 'forgemaster' ? CONFIG.FORGEMASTER_MINE_MULTIPLIER : 1;
        unit.carrying = CONFIG.GOLD_PER_TRIP * multiplier;
        unit.miningState = 'toBase';
      }
    } else if (unit.miningState === 'toBase') {
      if (Math.abs(unit.x - deliveryX) <= CONFIG.MINER_ARRIVE_THRESHOLD) {
        world.teams[unit.team].gold += unit.carrying;
        unit.carrying = 0;
        unit.miningState = 'toMine';
        unit.mineDepositIndex = null;
      }
    } else {
      // 'toMine' (also the safe default for any unexpected value)
      unit.miningState = 'toMine';
      if (Math.abs(unit.x - deposit.x) <= CONFIG.MINER_ARRIVE_THRESHOLD) {
        const miningCount = world.units.filter(
          (u) => u.minesGold && u.team === unit.team && u.miningState === 'mining' && u.state !== 'dying'
        ).length;
        if (miningCount < mineField.slots) {
          unit.miningState = 'mining';
          unit.mineTimer = CONFIG.MINE_CYCLE_TIME;
        }
      }
    }
  }
}

export function getMinerDesiredX(unit, world) {
  if (unit.miningState === 'mining') return { desiredX: unit.x, holding: true };
  if (unit.miningState === 'toBase') return { desiredX: getCoreDeliveryX(unit.team), holding: false };
  return { desiredX: assignedDeposit(world, unit).x, holding: false };
}
