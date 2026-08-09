import assert from 'node:assert/strict';
import { createRlEnvironment, RL_ACTIONS } from '../src/rl/environment.js';

assert.equal(RL_ACTIONS.length, 18, 'the policy contract must expose only 3 real commands × 6 production requests');
assert.ok(RL_ACTIONS.every((action) => ['defend', 'attack', 'retreat'].includes(action.command)), 'every action must name a real simulator command');
assert.ok(RL_ACTIONS.every((action) => !Object.hasOwn(action, 'targetIntent')), 'removed target labels must not remain in the policy contract');

const env = createRlEnvironment({ decisionSeconds: 1, maxEpisodeSeconds: 10 });
env.reset(24001);

for (const command of ['defend', 'attack', 'retreat']) {
  const actionIndex = RL_ACTIONS.findIndex((action) => action.command === command && action.production === 'none');
  assert.notEqual(actionIndex, -1, `${command} + none must be selectable`);
  const transition = env.step(actionIndex);
  assert.deepEqual(transition.actionResult, { ok: true, command, production: 'none' });
  assert.equal(env.world.teams.player.command, command, `${command} action must persist as the simulator command`);
}

console.log('PASS — the RL policy exposes only real, distinguishable command-and-production actions.');
