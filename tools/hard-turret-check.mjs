import { createWorld, createUnit } from '../src/sim/world.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';

const world = createWorld(1);
world.matchState = 'playing';
world.teams.ai.difficulty = 'hard';
world.teams.ai.gold = 1_000;
world.units.push(createUnit('miner', 'ai', world.mines.ai.x, world.mines.ai.y));
world.teams.ai.buildIndex = 5;
world.teams.ai.decisionTimer = 0;
updateAiDecisions(world, 0);
const queued = world.teams.ai.productionQueue[0];
if (queued?.action !== 'turret') throw new Error(`Hard AI should queue its planned turret: ${JSON.stringify(queued)}`);
console.log('PASS — Hard AI can choose and queue a turret.');
