import { CONFIG } from '../src/config.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { createUnit, createWorld } from '../src/sim/world.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';

const world = createWorld(9);
world.matchState = 'playing';
const team = 'player';
const state = world.teams[team];
state.difficulty = 'hard';
state.gold = 10_000;
world.units.push(createUnit('miner', team, CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y));

function decide() {
  state.decisionTimer = 0;
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
}

function addWarriors(count) {
  for (let i = 0; i < count; i += 1) {
    world.units.push(createUnit('warrior', team, CONFIG.PLAYER_HOME_X + i * 10, CONFIG.GROUND_Y));
  }
}

addWarriors(2);
decide();
if (state.command !== 'defend') {
  throw new Error(`Hard must defend with only two combat units; got ${state.command}`);
}

addWarriors(DIFFICULTIES.hard.attackLaunchCombatUnits - 2);
decide();
if (state.command !== 'attack') {
  throw new Error(`Hard must commit only after assembling its configured launch army; got ${state.command}`);
}

for (const unit of world.units) {
  if (unit.team === team && !unit.isMiner) unit.state = 'dying';
}
decide();
if (state.recovering !== true || state.command !== 'defend') {
  throw new Error(`Hard must enter defended recovery after its committed army is wiped; got ${JSON.stringify({ recovering: state.recovering, command: state.command })}`);
}

addWarriors(DIFFICULTIES.hard.attackLaunchCombatUnits - 1);
decide();
if (state.recovering !== true || state.command !== 'defend') {
  throw new Error(`Hard must stay in recovery until its army is rebuilt; got ${JSON.stringify({ recovering: state.recovering, command: state.command })}`);
}

addWarriors(1);
decide();
if (state.recovering !== false || state.command !== 'attack') {
  throw new Error(`Hard must leave recovery and attack only with a rebuilt configured launch army; got ${JSON.stringify({ recovering: state.recovering, command: state.command })}`);
}

console.log('PASS — Hard holds its configured launch threshold and defends through wipe recovery until rebuilt.');
