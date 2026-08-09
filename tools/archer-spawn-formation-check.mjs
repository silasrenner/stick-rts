import { createWorld, createUnit } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { updateMovement } from '../src/sim/systems/movement.js';

for (const team of ['player', 'ai']) {
  const world = createWorld(42);
  world.matchState = 'playing';
  const archer = createUnit('archer', team, team === 'player' ? 100 : 4900, 440);
  archer.command = 'defend';
  world.units.push(archer);
  updateFormationSlots(world);
  const before = archer.x;
  const slot = archer.slotX;
  updateMovement(world, 1);
  const movedTowardSlot = Math.abs(archer.x - slot) < Math.abs(before - slot);
  if (!movedTowardSlot) throw new Error(`${team} archer stayed at spawn instead of advancing toward its defend slot: start=${before}, slot=${slot}, end=${archer.x}`);
}
console.log('PASS — a newly spawned unescorted defender archer advances from home to its mine-side formation slot.');
