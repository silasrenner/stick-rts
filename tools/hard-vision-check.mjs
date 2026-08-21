import { CONFIG } from '../src/config.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const world = createWorld(1);
const playerMiner = createUnit('miner', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
const aiMiner = createUnit('miner', 'ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y);
world.units.push(playerMiner, aiMiner);

updateAiMemory(world, 'ai', 6);
if (world.aiMemory.ai?.currentlyVisibleEnemies?.length !== 0 || world.aiMemory.ai?.composition?.miner === 1) {
  throw new Error(`Hard must not have global live enemy composition outside team vision: ${JSON.stringify(world.aiMemory.ai)}`);
}

aiMiner.x = CONFIG.PLAYER_HOME_X + 100;
world.matchElapsedTime = 1;
updateAiMemory(world, 'ai', 6);
if (world.aiMemory.ai?.currentlyVisibleEnemies?.find((enemy) => enemy.id === playerMiner.id)?.kind !== 'miner') {
  throw new Error(`Hard must receive the current enemy snapshot after shared team vision reveals it: ${JSON.stringify(world.aiMemory.ai)}`);
}
console.log('PASS — Hard AI uses shared team visibility rather than global live-composition knowledge.');
