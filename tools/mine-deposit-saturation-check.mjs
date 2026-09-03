import { CONFIG } from '../src/config.js';
import { createUnit, createWorld, getCoreDeliveryX } from '../src/sim/world.js';
import { updateMining } from '../src/sim/systems/mining.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const world = createWorld(73);
expect(CONFIG.GOLD_PER_TRIP === 23, `Gold per completed trip must restore the original 23-gold yield; got ${CONFIG.GOLD_PER_TRIP}.`);
const playerDeposits = world.mines.player.deposits;
const aiDeposits = world.mines.ai.deposits;

expect(playerDeposits.length === 3 && aiDeposits.length === 3, 'Each team must expose exactly three mine deposits.');
expect(
  JSON.stringify(playerDeposits.map((deposit) => deposit.x)) === JSON.stringify([
    CONFIG.PLAYER_HOME_X + CONFIG.MINE_OFFSET - CONFIG.MINE_DEPOSIT_SPACING,
    CONFIG.PLAYER_HOME_X + CONFIG.MINE_OFFSET,
    CONFIG.PLAYER_HOME_X + CONFIG.MINE_OFFSET + CONFIG.MINE_DEPOSIT_SPACING,
  ]),
  `Player deposit positions must be centered and separated by ${CONFIG.MINE_DEPOSIT_SPACING}px.`
);
expect(
  JSON.stringify(aiDeposits.map((deposit) => deposit.x)) === JSON.stringify([
    CONFIG.AI_HOME_X - CONFIG.MINE_OFFSET + CONFIG.MINE_DEPOSIT_SPACING,
    CONFIG.AI_HOME_X - CONFIG.MINE_OFFSET,
    CONFIG.AI_HOME_X - CONFIG.MINE_OFFSET - CONFIG.MINE_DEPOSIT_SPACING,
  ]),
  'AI deposits must mirror the player deposit positions.'
);

const miners = Array.from({ length: 5 }, () => createUnit('miner', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y));
world.units.push(...miners);
updateMining(world, 0);

expect(
  JSON.stringify(miners.map((miner) => miner.mineDepositIndex)) === JSON.stringify([0, 1, 2, 0, 1]),
  `Early miners must deterministically distribute across deposits; got ${JSON.stringify(miners.map((miner) => miner.mineDepositIndex))}.`
);

const assigned = miners[0];
const assignedDeposit = playerDeposits[assigned.mineDepositIndex];
assigned.x = assignedDeposit.x;
updateMining(world, 0);
expect(assigned.miningState === 'mining', 'A miner reaching its assigned deposit must begin mining.');
expect(assigned.mineDepositIndex === 0, 'A miner must retain its deposit assignment while mining.');

for (const miner of miners.slice(1, 4)) {
  miner.x = playerDeposits[miner.mineDepositIndex].x;
}
updateMining(world, 0);
expect(
  world.units.filter((miner) => miner.miningState === 'mining').length === CONFIG.MINE_SLOTS,
  'Three deposits must preserve the existing shared four-miner extraction cap.'
);

const blocked = miners[4];
blocked.x = playerDeposits[blocked.mineDepositIndex].x;
updateMining(world, 0);
expect(blocked.miningState === 'toMine', 'A fifth miner must wait when the shared extraction cap is full.');

assigned.miningState = 'toBase';
assigned.carrying = CONFIG.GOLD_PER_TRIP;
assigned.x = getCoreDeliveryX('player');
const goldBeforeDelivery = world.teams.player.gold;
updateMining(world, 0);
expect(assigned.miningState === 'toMine' && assigned.mineDepositIndex === null, 'A miner must clear its assignment only after returning to the core-owned delivery lane.');
expect(world.teams.player.gold === goldBeforeDelivery + 23, `A completed normal mining trip must credit 23 gold; got ${world.teams.player.gold - goldBeforeDelivery}.`);

console.log('PASS — three mirrored deposits deterministically distribute miners while preserving core-owned delivery, stable trips, and the shared extraction cap.');
