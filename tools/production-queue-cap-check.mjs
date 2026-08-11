import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyUnit, buyStructure, buyTurret } from '../src/sim/systems/economy.js';

if (CONFIG.PRODUCTION_QUEUE_LIMIT !== 5) throw new Error(`Expected five-item production cap, got ${CONFIG.PRODUCTION_QUEUE_LIMIT}.`);

const world = createWorld(11);
world.teams.player.gold = 10000;
for (let i = 0; i < CONFIG.PRODUCTION_QUEUE_LIMIT; i += 1) {
  const result = buyUnit(world, 'player', 'warrior');
  if (!result.ok) throw new Error(`Queue fill failed at item ${i + 1}: ${result.reason}`);
}
for (const [label, buy] of [['unit', () => buyUnit(world, 'player', 'warrior')], ['structure', () => buyStructure(world, 'player')], ['turret', () => buyTurret(world, 'player')]]) {
  const result = buy();
  if (result.ok || result.reason !== 'queueFull') throw new Error(`${label} must be rejected with queueFull once five items are queued.`);
}
console.log('PASS — production queue accepts five items and blocks every sixth purchase.');
