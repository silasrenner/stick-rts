import assert from 'node:assert/strict';
import { runPureScriptedMirrorTrace } from './scripted-mirror-trace-runner.mjs';

const trace = runPureScriptedMirrorTrace({ seed: 26004, maxEpisodeSeconds: 600 });
assert.equal(trace.schema, 'stick-rts-scripted-mirror-trace-v1');
assert.equal(trace.matchup, 'hard-rl-v1-vs-hard-rl-v1');
assert.equal(trace.decisions.every((decision) => decision.team === 'player'), true);
assert.equal(trace.decisions.every((decision) => decision.observation.length === 35), true);
assert.equal(trace.decisions.every((decision) => decision.actionMask.length === 18), true);
assert.ok(trace.decisions.some((decision) => decision.action.command === 'attack'));
assert.equal(trace.summary.externalActionCount, 0);
assert.ok(
  trace.summary.combatContact || trace.summary.totalUnitLosses > 0 || trace.summary.totalCoreDamage > 0 || trace.summary.terminalReason !== 'time-limit',
  'a qualifying teacher trace must show real interaction, not only an attack label',
);

console.log('PASS — pure scripted mirror trace captures a qualifying active teacher match.');
