import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyUnit, getOccupiedCap, getPopulationState } from '../src/sim/systems/economy.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';
import { getCap } from '../src/sim/systems/supply.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const stats = CONFIG.UNIT_STATS.catapult;
expect(stats, 'Catapult must be an authoritative normal-unit stat entry.');
expect(stats.populationCost === 4, `Catapult must reserve exactly four population; got ${stats?.populationCost}.`);
expect(stats.cost === 1050, `Catapult cost must be 1050g after the approved 50% increase; got ${stats?.cost}.`);
expect(stats.buildTime === 24, `Catapult build time must start at 24s; got ${stats?.buildTime}.`);

const world = createWorld(381);
world.matchState = 'playing';
world.teams.player.gold = 10_000;
const purchase = buyUnit(world, 'player', 'catapult');
expect(purchase.ok, `Catapult purchase should be legal in an empty, funded world: ${JSON.stringify(purchase)}.`);
expect(getOccupiedCap(world, 'player') === 4, `Queued Catapult must reserve four population; got ${getOccupiedCap(world, 'player')}.`);
expect(getPopulationState(world, 'player').queued === 4, `Population UI state must expose four queued spaces; got ${JSON.stringify(getPopulationState(world, 'player'))}.`);
const queued = world.teams.player.productionQueue[0];
expect(queued?.kind === 'catapult' && queued.total === 24, `Catapult queue item must retain its kind and configured build time: ${JSON.stringify(queued)}.`);

updateProductionQueue(world, queued.total);
const catapult = world.units.find((unit) => unit.kind === 'catapult');
expect(catapult, 'Catapult must materialize from the normal FIFO queue.');
expect(getOccupiedCap(world, 'player') === 4, `Living Catapult must keep its four-space reservation; got ${getOccupiedCap(world, 'player')}.`);

world.teams.player.gold = 10_000;
while (getOccupiedCap(world, 'player') + 4 <= getCap(world, 'player')) {
  const next = buyUnit(world, 'player', 'catapult');
  expect(next.ok, `Catapult must be purchasable while four population remains: ${JSON.stringify(next)}.`);
  updateProductionQueue(world, world.teams.player.productionQueue[0].total);
}
const blocked = buyUnit(world, 'player', 'catapult');
expect(!blocked.ok && blocked.reason === 'cap', `Catapult must reject when fewer than four population remain: ${JSON.stringify(blocked)}.`);

console.log('PASS — Catapult is a 4-pop FIFO unit with exact configured cost/build time and cap enforcement.');
