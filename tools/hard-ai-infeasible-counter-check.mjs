import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

// This fixture reaches the real Hard AI decision seam. Enemy composition makes
// an archer the present counter preference, but an archer costs 280 while the
// AI has only 110 gold. A warrior is both affordable and legal.
const world = createWorld(73);
world.matchState = 'playing';

const team = 'ai';
const state = world.teams[team];
state.difficulty = 'hard';
state.decisionTimer = 0;
state.gold = CONFIG.UNIT_STATS.warrior.cost;

world.units.push(createUnit('miner', team, CONFIG.AI_HOME_X, CONFIG.GROUND_Y));
for (let i = 0; i < 3; i += 1) {
  world.units.push(createUnit('warrior', 'player', CONFIG.PLAYER_HOME_X + i * 10, CONFIG.GROUND_Y));
}

updateAiDecisions(world, 1 / CONFIG.TICK_HZ);

const queuedUnit = state.productionQueue.find((item) => item.action === 'unit');
const productiveFeasibleKinds = new Set(['miner', 'warrior']);
if (!queuedUnit || !productiveFeasibleKinds.has(queuedUnit.kind)) {
  throw new Error(
    `Hard must queue a productive feasible unit when its preferred archer is infeasible; got ${queuedUnit?.kind ?? 'no unit queued'}.`,
  );
}

console.log('PASS — Hard retains a productive feasible purchase when its preferred counter is unaffordable.');
