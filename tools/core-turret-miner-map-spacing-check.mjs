import { CONFIG } from '../src/config.js';
import { getCoreDeliveryX, createUnit, createWorld } from '../src/sim/world.js';
import { buyUnit } from '../src/sim/systems/economy.js';
import { getMinerDesiredX, updateMining } from '../src/sim/systems/mining.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const CORE_WIDTH = 34 * CONFIG.CORE_RENDER_SCALE;
const TURRET_WIDTH = 32 * CONFIG.TURRET_RENDER_SCALE;
const expectedHomes = { player: 100, ai: 6900 };

expect(CONFIG.WORLD_WIDTH === 7000, `World width must be 7000px; got ${CONFIG.WORLD_WIDTH}.`);
expect(CONFIG.AI_HOME_X === expectedHomes.ai && CONFIG.AI_FLEE_X === 6960, `AI home/flee endpoints must follow the 7000px map; got ${CONFIG.AI_HOME_X}/${CONFIG.AI_FLEE_X}.`);
expect(CONFIG.CAMERA_ZOOM_MIN === CONFIG.VIEWPORT_WIDTH / CONFIG.WORLD_WIDTH, 'Full-map minimum zoom must derive directly from viewport/world width.');
expect(CONFIG.STARTING_TURRET_OFFSET === 140, `Starting turret must move to the spaced 140px base offset; got ${CONFIG.STARTING_TURRET_OFFSET}.`);
expect(CONFIG.MINER_CORE_DELIVERY_OFFSET === 260, `Miner core-delivery lane must use the approved 260px offset; got ${CONFIG.MINER_CORE_DELIVERY_OFFSET}.`);
expect(CONFIG.MINE_OFFSET === 500, `Mine line must move to the approved 500px offset; got ${CONFIG.MINE_OFFSET}.`);

const world = createWorld(902);
for (const team of ['player', 'ai']) {
  const sign = team === 'player' ? 1 : -1;
  const homeX = expectedHomes[team];
  const turret = world.structures.find((entity) => entity.team === team && entity.isStartingTurret);
  const coreLeft = homeX - CORE_WIDTH / 2;
  const coreRight = homeX + CORE_WIDTH / 2;
  const turretLeft = turret.x - TURRET_WIDTH / 2;
  const turretRight = turret.x + TURRET_WIDTH / 2;
  const coreEdge = sign === 1 ? coreRight : coreLeft;
  const turretNearEdge = sign === 1 ? turretLeft : turretRight;

  expect(sign * (turretNearEdge - coreEdge) > 0, `${team} core and starting turret rendered bounds must not overlap.`);
  expect(turret.x === homeX + sign * CONFIG.STARTING_TURRET_OFFSET, `${team} starting turret must remain mirrored from home.`);

  const deliveryX = getCoreDeliveryX(team);
  expect(deliveryX === homeX + sign * CONFIG.MINER_CORE_DELIVERY_OFFSET, `${team} miner core-delivery lane must mirror from home.`);
  expect(sign * (deliveryX - turret.x) > TURRET_WIDTH / 2, `${team} miner delivery lane must sit beyond the starting turret footprint.`);

  const deposits = world.mines[team].deposits;
  expect(deposits.length === 3, `${team} must retain three deposits.`);
  expect(deposits[1].x === homeX + sign * CONFIG.MINE_OFFSET, `${team} mine line must move with the mirrored base geometry.`);
  expect(deposits.every((deposit) => sign * (deposit.x - deliveryX) > 0), `${team} all mine deposits must remain beyond the miner delivery lane.`);

  world.teams[team].gold = 10_000;
  expect(buyUnit(world, team, 'miner').ok, `${team} miner purchase must remain legal.`);
  updateProductionQueue(world, CONFIG.MINER_BUILD_TIME);
  const miner = world.units.at(-1);
  expect(miner.x === deliveryX, `${team} newly materialized miner must start in the clear core-delivery lane.`);

  miner.miningState = 'toBase';
  miner.carrying = CONFIG.GOLD_PER_TRIP;
  miner.x = deliveryX;
  const goldBefore = world.teams[team].gold;
  updateMining(world, 0);
  expect(miner.miningState === 'toMine' && miner.mineDepositIndex === null, `${team} delivery at the core-owned lane must start the next mine trip.`);
  expect(world.teams[team].gold === goldBefore + CONFIG.GOLD_PER_TRIP, `${team} core delivery must preserve the existing completed-trip yield.`);

  const routeMiner = createUnit('miner', team, deliveryX, CONFIG.GROUND_Y);
  routeMiner.miningState = 'toBase';
  expect(getMinerDesiredX(routeMiner, world).desiredX === deliveryX, `${team} returning miner must route to the clear core-delivery lane, not the core/turret footprint.`);
}

console.log('PASS — 7000px mirrored base geometry separates the core, turret, miner delivery lane, and mine line while preserving core-owned mining delivery.');
