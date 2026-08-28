import { CONFIG } from '../src/config.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';

const world = createWorld(417);
world.matchState = 'playing';
const mineX = world.mines.player.deposits[1].x;
const miner = createUnit('miner', 'player', mineX, CONFIG.GROUND_Y);
miner.mineDepositIndex = 1; // already committed to the center dot; exclude normal assignment travel from this retreat repro
const archer = createUnit('archer', 'ai', mineX + 320, CONFIG.GROUND_Y);
world.units.push(miner, archer);

runTick(world, 1 / CONFIG.TICK_HZ);
if (archer.targetId !== miner.id) throw new Error(`Fixture invalid: enemy archer must acquire the miner from attack range; got ${archer.targetId}.`);
const beforeRetreatTick = miner.x;
runTick(world, 1 / CONFIG.TICK_HZ);

if (!(miner.x < beforeRetreatTick)) {
  throw new Error(`A miner under ranged attack must begin retreating toward its core even when the attacker is outside the old ${miner.threatRange}px proximity radius; x remained ${miner.x}.`);
}
if (!(miner.x >= CONFIG.PLAYER_HOME_X)) {
  throw new Error(`Threatened player miner must retreat toward core ${CONFIG.PLAYER_HOME_X}, not past it; got ${miner.x}.`);
}

console.log('PASS — miners respond to active ranged attacks by retreating toward their core.');
