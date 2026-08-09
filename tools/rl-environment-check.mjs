import { createRlEnvironment, RL_ACTIONS } from '../src/rl/environment.js';

function summary(transition) {
  return JSON.stringify({
    observation: transition.observation,
    actionMask: transition.actionMask,
    reward: transition.reward,
    rewardComponents: transition.rewardComponents,
    terminated: transition.terminated,
    truncated: transition.truncated,
    terminalReason: transition.terminalReason,
    actionResult: transition.actionResult,
  });
}

if (RL_ACTIONS.length !== 18) throw new Error(`Expected 18 bounded command/production actions, received ${RL_ACTIONS.length}.`);
const env = createRlEnvironment({ decisionSeconds: 1, maxEpisodeSeconds: 20 });
const reset = env.reset(4401);
if (!Array.isArray(reset.observation) || reset.observation.length !== 35 || reset.actionMask.length !== RL_ACTIONS.length) {
  throw new Error('RL reset did not return the v2 observation and one legality bit per real action.');
}
const attackMiner = RL_ACTIONS.findIndex((action) => action.command === 'attack' && action.production === 'miner');
if (attackMiner < 0 || reset.actionMask[attackMiner] !== 1) throw new Error('A legal opening attack/miner macro action is missing or masked.');
const first = env.step(attackMiner);
if (!first.actionResult.ok || first.actionResult.command !== 'attack' || first.actionResult.production !== 'miner') {
  throw new Error(`Legal RL action was not explicitly executed: ${JSON.stringify(first.actionResult)}`);
}
if (env.world.teams.player.command !== 'attack' || env.world.teams.player.productionQueue[0]?.kind !== 'miner') {
  throw new Error('RL action did not use the deterministic command and production executors.');
}
const attackWarrior = RL_ACTIONS.findIndex((action) => action.command === 'attack' && action.production === 'warrior');
const maintained = env.step(attackWarrior);
if (!maintained.actionResult.ok || env.world.teams.player.command !== 'attack'
  || !env.world.teams.player.productionQueue.some((item) => item.kind === 'warrior')) {
  throw new Error('Attack/warrior did not explicitly maintain attack while issuing production.');
}
const beforeInvalid = JSON.stringify({ command: env.world.teams.player.command, queue: env.world.teams.player.productionQueue });
const invalid = env.step(-1);
if (invalid.actionResult.ok || invalid.actionResult.reason !== 'invalid-action-index' || beforeInvalid !== JSON.stringify({ command: env.world.teams.player.command, queue: env.world.teams.player.productionQueue })) {
  throw new Error('Illegal RL action was accepted or replaced with a strategic fallback.');
}
const left = createRlEnvironment({ decisionSeconds: 1, maxEpisodeSeconds: 20 });
const right = createRlEnvironment({ decisionSeconds: 1, maxEpisodeSeconds: 20 });
left.reset(9922);
right.reset(9922);
const trace = [attackMiner, attackMiner, attackMiner];
for (const action of trace) {
  if (summary(left.step(action)) !== summary(right.step(action))) throw new Error('Same seed and action trace diverged.');
}
console.log('PASS — RL environment executes bounded real macros, rejects invalid actions without fallback, and is deterministic.');
