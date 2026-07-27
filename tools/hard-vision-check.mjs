import { createWorld, createUnit } from '../src/sim/world.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';

const world = createWorld(1);
const playerMiner = createUnit('miner', 'player', 0, 0);
const aiMiner = createUnit('miner', 'ai', 1400, 0);
world.units.push(playerMiner, aiMiner);

updateAiMemory(world, 'ai', true);
if (world.aiMemory.ai?.composition?.miner !== 1) {
  throw new Error(`Hard global vision must retain the live enemy composition: ${JSON.stringify(world.aiMemory.ai)}`);
}
console.log('PASS — Hard AI has global live-composition knowledge even outside sight range.');
