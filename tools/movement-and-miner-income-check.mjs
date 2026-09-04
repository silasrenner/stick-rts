import { CONFIG } from '../src/config.js';
import { createUnit, createWorld, getCoreDeliveryX } from '../src/sim/world.js';
import { getMinerTripYield } from '../src/sim/systems/mining.js';

const EPSILON = 1e-9;
function expect(condition, message) { if (!condition) throw new Error(message); }
const referenceSpeed = 80;
expect(CONFIG.UNIT_STATS.miner.speed === referenceSpeed * 0.8, `Miner speed must be 20% slower (64); got ${CONFIG.UNIT_STATS.miner.speed}.`);
for (const kind of ['warrior', 'archer', 'catapult']) expect(CONFIG.UNIT_STATS[kind].speed === 90 * 0.8, `${kind} must be 20% slower; got ${CONFIG.UNIT_STATS[kind].speed}.`);
for (const kind of ['forgemaster', 'hawkeye', 'vanguard']) expect(CONFIG.HERO_STATS[kind].speed === ({ forgemaster: 70, hawkeye: 75, vanguard: 85 }[kind] * 0.8), `${kind} must be 20% slower.`);
expect(CONFIG.RAVEN.movementSpeed === 560 * 0.8 && CONFIG.RAVEN.exitSpeed === 700 * 0.8, `Raven movement and exit must be 20% slower: ${JSON.stringify(CONFIG.RAVEN)}.`);

const world = createWorld(42);
for (const [index, deposit] of world.mines.player.deposits.entries()) {
  const miner = createUnit('miner', 'player', deposit.x, CONFIG.GROUND_Y);
  miner.mineDepositIndex = index;
  const distance = Math.abs(deposit.x - getCoreDeliveryX('player'));
  const originalCycle = CONFIG.MINE_CYCLE_TIME + 2 * distance / referenceSpeed;
  const slowedCycle = CONFIG.MINE_CYCLE_TIME + 2 * distance / miner.speed;
  const yieldAmount = getMinerTripYield(world, miner);
  expect(Math.abs(yieldAmount / slowedCycle - CONFIG.GOLD_PER_TRIP / originalCycle) < EPSILON, `Deposit ${index} income must remain unchanged: ${JSON.stringify({ distance, yieldAmount, slowedCycle, originalCycle })}.`);
}
console.log('PASS — every movable unit and Raven is 20% slower, while each miner route retains its original steady-state income.');
