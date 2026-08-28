import { CONFIG } from '../src/config.js';
import { createWorld, createUnit } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { updateMovement } from '../src/sim/systems/movement.js';

for (const team of ['player', 'ai']) {
  const world = createWorld(84);
  world.matchState = 'playing';
  const sign = team === 'player' ? 1 : -1;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const archer = createUnit('archer', team, homeX + sign * 700, CONFIG.GROUND_Y);
  archer.command = 'defend';
  world.units.push(archer);

  updateFormationSlots(world);
  const before = archer.x;
  const slot = archer.slotX;
  updateMovement(world, 1);

  const movedTowardSlot = Math.abs(archer.x - slot) < Math.abs(before - slot);
  if (!movedTowardSlot) throw new Error(`${team} stranded archer must return to its defend slot without a nearby warrior: start=${before}, slot=${slot}, end=${archer.x}`);
}

console.log('PASS — defending archers return to their assigned positions without waiting for warriors.');
