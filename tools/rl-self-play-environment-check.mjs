import { createSelfPlayEnvironment, RL_ACTIONS } from '../src/rl/environment.js';

const minerAtMidpoint = RL_ACTIONS.findIndex((action) => action.targetIntent === 'contest-mid' && action.production === 'miner');
const environment = createSelfPlayEnvironment({ decisionSeconds: 1, maxEpisodeSeconds: 20 });
const reset = environment.reset(5010);
for (const team of ['player', 'ai']) {
  if (!Array.isArray(reset.observation[team]) || reset.actionMask[team][minerAtMidpoint] !== 1) {
    throw new Error(`Self-play reset omitted a legal observation/action mask for ${team}.`);
  }
}
const transition = environment.step({ player: minerAtMidpoint, ai: minerAtMidpoint });
for (const team of ['player', 'ai']) {
  if (!transition.actionResult[team].ok || environment.world.teams[team].command !== 'attack'
    || environment.world.teams[team].commanderTargetAnchor?.id !== 'midpoint'
    || environment.world.teams[team].productionQueue[0]?.kind !== 'miner') {
    throw new Error(`Self-play action did not execute the ${team} action through the shared deterministic world.`);
  }
}
if (transition.reward.player !== -transition.reward.ai) throw new Error(`Self-play reward was not zero-sum: ${JSON.stringify(transition.reward)}`);
const before = JSON.stringify(environment.world.teams.player.productionQueue.map(({ action, kind }) => ({ action, kind })));
const invalid = environment.step({ player: -1, ai: minerAtMidpoint });
if (invalid.actionResult.player.ok || invalid.actionResult.player.reason !== 'invalid-action-index'
  || before !== JSON.stringify(environment.world.teams.player.productionQueue.map(({ action, kind }) => ({ action, kind })))
  || !invalid.actionResult.ai.ok) {
  throw new Error('One invalid self-play action mutated state or prevented the valid opponent action.');
}
console.log('PASS — self-play environment executes simultaneous team actions and isolates invalid actions without fallback.');
