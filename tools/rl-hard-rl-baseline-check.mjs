import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createScriptedOpponentEnvironment, RL_ACTIONS } from '../src/rl/environment.js';
import { createUnit } from '../src/sim/world.js';

const env = createScriptedOpponentEnvironment({ opponentDifficulty: 'hard-rl-v1', decisionSeconds: 1, maxEpisodeSeconds: 30 });
const reset = env.reset(25001);
assert.equal(env.world.teams.ai.difficulty, 'hard-rl-v1', 'the named restricted scripted baseline must be selectable');

// Fill the scripted opponent's population and funds so its next scripted
// production request is cap-blocked. The restricted baseline must leave that
// block explicit; it must not silently buy a structure instead.
env.world.teams.ai.gold = 10_000;
for (let index = 0; index < 100; index += 1) {
  env.world.units.push(createUnit('warrior', 'ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y));
}
env.world.teams.ai.decisionTimer = 0;
const learnerAction = reset.actionMask.findIndex(Boolean);
env.step(learnerAction);
assert.equal(
  env.world.teams.ai.productionQueue.some((item) => item.action === 'structure'),
  false,
  'hard-rl-v1 must not hide a cap-blocked scripted request by buying a structure',
);

for (let second = 0; second < 24; second += 1) env.step(learnerAction);
assert.equal(
  env.world.units.some((unit) => unit.team === 'ai' && unit.isHero),
  false,
  'hard-rl-v1 must never purchase heroes outside the 18-action policy contract',
);

assert.equal(RL_ACTIONS.length, 18);
console.log('PASS — hard-rl-v1 stays within the restricted learner action contract.');
