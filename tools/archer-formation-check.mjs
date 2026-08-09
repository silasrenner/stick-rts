import { CONFIG } from '../src/config.js';
import { createWorld, createUnit } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { updateMovement } from '../src/sim/systems/movement.js';

const world = createWorld(1);
world.matchState = 'playing';
world.teams.player.command = 'defend';
const warrior = createUnit('warrior', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
const archer = createUnit('archer', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
world.units.push(warrior);
updateFormationSlots(world);
warrior.x = warrior.slotX; warrior.y = warrior.slotY;
world.units.push(archer);
updateFormationSlots(world);
for (let i = 0; i < 600; i += 1) updateMovement(world, 1 / CONFIG.TICK_HZ);
if (Math.abs(archer.x - archer.slotX) > 3) throw new Error(`Archer must join its defend slot even before it reaches the warrior line: x=${archer.x} slot=${archer.slotX}`);
if (!(archer.x < warrior.x)) throw new Error(`Archer must remain behind the warrior after joining formation: archer=${archer.x} warrior=${warrior.x}`);
console.log('PASS — defending archer joins the warrior formation instead of waiting at home.');
