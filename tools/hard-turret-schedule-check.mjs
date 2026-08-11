import { CONFIG } from '../src/config.js';
import { createWorld, createStructure } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';
import { buyUnit } from '../src/sim/systems/economy.js';

const world = createWorld(7);
world.matchState = 'playing';
world.matchElapsedTime = CONFIG.HARD_TURRET_FIRST_TIME;

for (const team of ['player', 'ai']) {
  world.teams[team].difficulty = 'hard';
  world.teams[team].decisionTimer = 0;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  world.structures.push(createStructure(team, homeX + CONFIG.STRUCTURE_SLOT_OFFSETS[0]));
  world.teams[team].gold = 2_000;

  for (let i = 0; i < CONFIG.PRODUCTION_QUEUE_LIMIT - 1; i += 1) {
    const purchase = buyUnit(world, team, 'warrior');
    if (!purchase.ok) throw new Error(`Fixture queue setup failed for ${team}: ${JSON.stringify(purchase)}`);
  }

  for (const item of world.teams[team].productionQueue) item.remaining = 999;
  world.teams[team].gold = 2_000;
}

runTick(world, 1 / CONFIG.TICK_HZ);

for (const team of ['player', 'ai']) {
  const queue = world.teams[team].productionQueue;
  const turret = queue.find((item) => item.action === 'turret');
  if (!turret) {
    throw new Error(`Hard ${team} must reserve the final legal queue slot for its due turret; got ${queue.map((item) => item.action).join(', ')}`);
  }
  if (queue.length !== CONFIG.PRODUCTION_QUEUE_LIMIT) {
    throw new Error(`Hard ${team} must use, not bypass, the five-item queue; got ${queue.length}`);
  }
  if (world.teams[team].gold !== 2_000 - CONFIG.TURRET_COST) {
    throw new Error(`Hard ${team} must pay the normal ${CONFIG.TURRET_COST}g turret cost; got ${world.teams[team].gold}`);
  }
}

// Complete one ordinary queue item while the first turret is still queued.
// Hard gets another decision immediately, but its second turret must remain
// gated by the configured 13-minute schedule rather than using this new slot.
for (const team of ['player', 'ai']) {
  world.teams[team].productionQueue[0].remaining = 0.001;
  world.teams[team].decisionTimer = 0;
}
runTick(world, 1 / CONFIG.TICK_HZ); // decision sees the still-full queue; production then frees one slot
for (const team of ['player', 'ai']) world.teams[team].decisionTimer = 0;
runTick(world, 1 / CONFIG.TICK_HZ); // next Hard decision sees the newly available legal slot

for (const team of ['player', 'ai']) {
  const queuedTurrets = world.teams[team].productionQueue.filter((item) => item.action === 'turret');
  if (queuedTurrets.length !== 1) {
    throw new Error(`Hard ${team} must not queue its second turret before ${CONFIG.HARD_TURRET_SECOND_TIME}s; got ${queuedTurrets.length} queued turrets at ${world.matchElapsedTime.toFixed(2)}s`);
  }
}

console.log('PASS — due Hard turrets take the final legal queue slot through the normal economy path for both teams.');
