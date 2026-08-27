import { CONFIG } from '../src/config.js';
import { createWorld, createTurret, createStructure } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';
import { buyUnit } from '../src/sim/systems/economy.js';

if (CONFIG.HARD_TURRET_THIRD_TIME !== 20 * 60) throw new Error(`Expected Hard third-turret schedule at 20 minutes, got ${CONFIG.HARD_TURRET_THIRD_TIME}.`);

const world = createWorld(37);
world.matchState = 'playing';
world.matchElapsedTime = CONFIG.HARD_TURRET_THIRD_TIME;
for (const team of ['player', 'ai']) {
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const sign = team === 'player' ? 1 : -1;
  world.teams[team].difficulty = 'hard';
  world.teams[team].decisionTimer = 0;
  world.teams[team].gold = 10_000;
  for (const offset of CONFIG.TURRET_SLOT_OFFSETS.slice(0, 2)) world.structures.push(createTurret(team, homeX + sign * offset, CONFIG.GROUND_Y));
  for (const offset of CONFIG.STRUCTURE_SLOT_OFFSETS.slice(0, 3)) world.structures.push(createStructure(team, homeX + sign * offset, CONFIG.GROUND_Y));
  for (let i = 0; i < CONFIG.PRODUCTION_QUEUE_LIMIT - 1; i += 1) {
    const result = buyUnit(world, team, 'warrior');
    if (!result.ok) throw new Error(`Queue fixture setup failed for ${team}: ${JSON.stringify(result)}`);
  }
  for (const item of world.teams[team].productionQueue) item.remaining = 999;
}

runTick(world, 1 / CONFIG.TICK_HZ);
for (const team of ['player', 'ai']) {
  const queuedTurrets = world.teams[team].productionQueue.filter((item) => item.action === 'turret');
  if (queuedTurrets.length !== 1) throw new Error(`Hard ${team} must queue its third tower at 20 minutes: ${JSON.stringify(world.teams[team].productionQueue)}`);
}

console.log('PASS — Hard schedules its third buildable turret at 20 minutes through the normal FIFO queue for both teams.');
