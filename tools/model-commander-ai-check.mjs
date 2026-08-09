import { createWorld, createUnit, createTurret } from '../src/sim/world.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';

const world = createWorld(17);
world.matchState = 'playing';
world.teams.ai.difficulty = 'hard';
world.teams.ai.modelCommander = true;
world.teams.ai.command = 'retreat';
world.teams.ai.commanderPriority = ['archer'];
world.teams.ai.commanderPlan = { status: 'active' };
world.teams.ai.gold = 300;
world.teams.ai.decisionTimer = 0;
world.units.push(createUnit('miner', 'ai', world.mines.ai.x, world.mines.ai.y));
updateAiDecisions(world, 0);
if (world.teams.ai.productionQueue[0]?.kind !== 'archer') throw new Error(`Model purchase priority was ignored: ${JSON.stringify(world.teams.ai.productionQueue[0])}`);
if (world.teams.ai.commanderPriority.length !== 0) throw new Error(`A completed model purchase was not consumed: ${JSON.stringify(world.teams.ai.commanderPriority)}`);
if (world.teams.ai.commanderPlan.status !== 'executing') throw new Error(`A fully queued model plan was not marked executing: ${JSON.stringify(world.teams.ai.commanderPlan)}`);
world.teams.ai.commanderPriority = ['warrior', 'miner'];
world.teams.ai.gold = 1000;
world.teams.ai.decisionTimer = 0;
updateAiDecisions(world, 0);
if (world.teams.ai.productionQueue[1]?.kind !== 'warrior' || world.teams.ai.commanderPriority.join('|') !== 'miner') {
  throw new Error(`Model purchase plan did not advance after a successful queue: ${JSON.stringify({ queue: world.teams.ai.productionQueue, priorities: world.teams.ai.commanderPriority })}`);
}
if (world.teams.ai.command !== 'retreat') throw new Error(`Model command was overwritten by scripted AI: ${world.teams.ai.command}`);

const cappedTurretWorld = createWorld(18);
cappedTurretWorld.matchState = 'playing';
cappedTurretWorld.teams.ai.difficulty = 'hard';
cappedTurretWorld.teams.ai.modelCommander = true;
cappedTurretWorld.teams.ai.commanderPriority = ['turret', 'warrior'];
cappedTurretWorld.teams.ai.gold = 300;
cappedTurretWorld.teams.ai.decisionTimer = 0;
cappedTurretWorld.units.push(createUnit('miner', 'ai', cappedTurretWorld.mines.ai.x, cappedTurretWorld.mines.ai.y));
cappedTurretWorld.structures.push(createTurret('ai', 900, 440), createTurret('ai', 960, 440));
updateAiDecisions(cappedTurretWorld, 0);
if (cappedTurretWorld.teams.ai.productionQueue.length !== 0) throw new Error(`Model Commander injected a structure fallback: ${JSON.stringify(cappedTurretWorld.teams.ai.productionQueue)}`);
if (cappedTurretWorld.teams.ai.commanderPriority.join('|') !== 'warrior') throw new Error(`Model Commander did not retain its capacity-blocked next priority: ${JSON.stringify(cappedTurretWorld.teams.ai.commanderPriority)}`);

const autonomousWorld = createWorld(19);
autonomousWorld.matchState = 'playing';
autonomousWorld.matchElapsedTime = 120;
autonomousWorld.teams.ai.difficulty = 'hard';
autonomousWorld.teams.ai.modelCommander = true;
autonomousWorld.teams.ai.commanderPriority = [];
autonomousWorld.teams.ai.gold = 2000;
autonomousWorld.teams.ai.decisionTimer = 0;
updateAiDecisions(autonomousWorld, 0);
if (autonomousWorld.teams.ai.productionQueue.length !== 0) throw new Error(`Model mode used scripted fallback purchases: ${JSON.stringify(autonomousWorld.teams.ai.productionQueue)}`);
console.log('PASS — model commander priority drives purchases without scripted command override, capped-turret stalls, or hidden scripted strategy.');
