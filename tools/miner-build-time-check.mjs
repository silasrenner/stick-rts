import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyUnit } from '../src/sim/systems/economy.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';

function expect(condition, message) { if (!condition) throw new Error(message); }
const world = createWorld(55);
expect(CONFIG.MINER_BUILD_TIME === 5.75, `Miner build time must increase exactly 15% from 5s to 5.75s; got ${CONFIG.MINER_BUILD_TIME}.`);
expect(buyUnit(world, 'player', 'miner').ok, 'Miner fixture purchase must succeed.');
updateProductionQueue(world, 5.74);
expect(world.units.length === 0, 'Miner must remain queued before 5.75s.');
updateProductionQueue(world, 0.01);
expect(world.units.length === 1 && world.units[0].kind === 'miner', 'Miner must complete at exactly 5.75s.');
console.log('PASS — miner production completes at the 15%-increased 5.75s duration.');
