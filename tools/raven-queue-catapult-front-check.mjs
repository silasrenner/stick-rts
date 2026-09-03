import { CONFIG } from '../src/config.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { buyRaven, buyUnit, getOccupiedCap } from '../src/sim/systems/economy.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';

function expect(condition, message) { if (!condition) throw new Error(message); }

{
  const world = createWorld(801);
  world.matchState = 'playing';
  world.teams.player.gold = 20_000;
  for (let i = 0; i < CONFIG.PRODUCTION_QUEUE_LIMIT; i += 1) expect(buyUnit(world, 'player', 'warrior').ok, `Queue fixture failed at ${i}.`);
  const queueBefore = world.teams.player.productionQueue.length;
  const capBefore = getOccupiedCap(world, 'player');
  const goldBefore = world.teams.player.gold;
  const result = buyRaven(world, 'player');
  expect(result.ok, `Raven must remain purchasable with a full normal queue: ${JSON.stringify(result)}.`);
  expect(world.teams.player.productionQueue.length === queueBefore && getOccupiedCap(world, 'player') === capBefore, 'Raven must not alter FIFO items or population reservation.');
  expect(world.teams.player.gold === goldBefore - CONFIG.RAVEN.cost && world.ravens.length === 1, 'Raven must spend only its own cost and create its normal lifecycle record.');
}

for (const team of ['player', 'ai']) {
  const world = createWorld(802);
  world.matchState = 'playing';
  world.units = [
    ...Array.from({ length: 5 }, () => createUnit('catapult', team, 0, CONFIG.GROUND_Y)),
    ...Array.from({ length: 8 }, () => createUnit('warrior', team, 0, CONFIG.GROUND_Y)),
    ...Array.from({ length: 8 }, () => createUnit('archer', team, 0, CONFIG.GROUND_Y)),
  ];
  updateFormationSlots(world);
  const exposure = (unit) => (team === 'player' ? 1 : -1) * unit.slotX;
  const cats = world.units.filter((unit) => unit.kind === 'catapult').map(exposure);
  const warriors = world.units.filter((unit) => unit.kind === 'warrior').map(exposure);
  const archers = world.units.filter((unit) => unit.kind === 'archer').map(exposure);
  expect(Math.min(...cats) > Math.max(...warriors), `${team} every Catapult column must lead every Warrior column: ${JSON.stringify({ cats, warriors })}.`);
  expect(Math.min(...warriors) > Math.max(...archers), `${team} every Warrior column must lead every Archer column: ${JSON.stringify({ warriors, archers })}.`);
}

console.log('PASS — Raven bypasses FIFO fullness and Catapult overflow leads Warriors and Archers for both teams.');
