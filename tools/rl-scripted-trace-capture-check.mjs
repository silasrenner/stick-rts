import assert from 'node:assert/strict';
import { createScriptedOpponentEnvironment } from '../src/rl/environment.js';

const decisions = [];
const env = createScriptedOpponentEnvironment({
  opponentDifficulty: 'hard-rl-v1',
  decisionSeconds: 5,
  maxEpisodeSeconds: 30,
  onScriptedDecision: (decision) => decisions.push(decision),
});
const reset = env.reset(26001);
const learnerAction = reset.actionMask.findIndex(Boolean);
env.step(learnerAction);

const emittedDecisions = decisions.filter((decision) => decision.type === 'decision');
assert.ok(emittedDecisions.length > 0, 'the restricted scripted opponent must emit an event for every real decision boundary');
for (const decision of emittedDecisions) {
  assert.equal(decision.baseline, 'hard-rl-v1');
  assert.ok(['defend', 'attack', 'retreat'].includes(decision.command));
  assert.ok(['none', 'miner', 'warrior', 'archer', 'structure', 'turret'].includes(decision.production));
  assert.ok(Number.isFinite(decision.simulatedSeconds));
}

console.log('PASS — hard-rl-v1 emits policy-representable full-cadence decisions.');
