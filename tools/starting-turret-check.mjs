import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyUnit } from '../src/sim/systems/economy.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';

const world = createWorld(71);
for (const team of ['player', 'ai']) {
  const turret = world.structures.find((entity) => entity.team === team && entity.isStartingTurret);
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const sign = team === 'player' ? 1 : -1;
  if (!turret || turret.x !== homeX + sign * CONFIG.STARTING_TURRET_OFFSET) throw new Error(`Missing or misplaced starting turret for ${team}`);
  world.teams[team].gold = 10_000;
  for (let i = 0; i < CONFIG.BASE_UNIT_CAP; i += 1) {
    if (!buyUnit(world, team, 'miner').ok) throw new Error(`Starting turret must not consume ${team} population.`);
    updateProductionQueue(world, CONFIG.MINER_BUILD_TIME);
  }
}
if (CONFIG.WORLD_WIDTH !== 7000 || CONFIG.AI_HOME_X !== 6900 || CONFIG.AI_FLEE_X !== 6960) throw new Error('7000px map endpoints are inconsistent.');
console.log('PASS — teams start with a free base turret and full starting population on the 7000px map.');
