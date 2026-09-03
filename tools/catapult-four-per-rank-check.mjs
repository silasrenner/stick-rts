import { CONFIG } from '../src/config.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(CONFIG.CATAPULT_FORMATION_SLOTS_PER_RANK === 4, `Catapult rank capacity must be 4; got ${CONFIG.CATAPULT_FORMATION_SLOTS_PER_RANK}.`);

for (const team of ['player', 'ai']) {
  const world = createWorld(612);
  world.matchState = 'playing';
  const catapults = Array.from({ length: 5 }, () => createUnit('catapult', team, 0, CONFIG.GROUND_Y));
  const warriors = Array.from({ length: 7 }, () => createUnit('warrior', team, 0, CONFIG.GROUND_Y));
  world.units.push(...catapults, ...warriors);
  updateFormationSlots(world);
  expect(new Set(catapults.slice(0, 4).map((unit) => unit.slotX)).size === 1, `${team} first four Catapults must share one rank column.`);
  expect(new Set(catapults.slice(0, 4).map((unit) => unit.slotY)).size === 4, `${team} first Catapult rank must contain four distinct files.`);
  expect(Math.abs(catapults[0].slotY - catapults[1].slotY) === 52, `${team} Catapult file spacing must remain 52px.`);
  expect(catapults[4].slotX !== catapults[0].slotX && catapults[4].slotY === catapults[0].slotY, `${team} fifth Catapult must begin the next column at the ground file.`);
  expect(new Set(warriors.slice(0, 6).map((unit) => unit.slotX)).size === 1 && warriors[6].slotX !== warriors[0].slotX, `${team} Warriors must retain their six-unit rank capacity.`);
}

console.log('PASS — Catapult ranks contain exactly four units without changing other formation capacities.');
