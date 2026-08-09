import { CONFIG } from '../src/config.js';
import { createWorld, createUnit } from '../src/sim/world.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';

const world = createWorld(11);
world.matchState = 'playing';
world.teams.ai.difficulty = 'hard';
world.teams.ai.gold = CONFIG.TURRET_COST;
world.matchElapsedTime = CONFIG.HARD_TURRET_FIRST_TIME;
world.teams.ai.decisionTimer = 0;
world.units.push(
  createUnit('miner', 'ai', world.mines.ai.x, world.mines.ai.y),
  createUnit('miner', 'ai', world.mines.ai.x, world.mines.ai.y),
  createUnit('warrior', 'ai', world.mines.ai.x, world.mines.ai.y),
  createUnit('warrior', 'ai', world.mines.ai.x, world.mines.ai.y),
);
updateAiDecisions(world, 0);
const active = world.teams.ai.productionQueue[0];
if (active?.action !== 'turret') throw new Error(`Hard AI must prioritize saving for its first turret once it has a stable economy and defense: ${JSON.stringify(active)}`);
console.log('PASS — Hard AI prioritizes its first affordable turret after establishing economy and defense.');
