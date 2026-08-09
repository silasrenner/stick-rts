import assert from 'node:assert/strict';
import { pureScriptedMirror, rlWrappedMirror } from './rl-mirror-diagnostic.mjs';

const seed = 26004;
const seconds = 600;
const pure = pureScriptedMirror(seed, seconds);
const wrapped = rlWrappedMirror(seed, seconds);

assert.equal(pure.playerDifficulty, 'hard-rl-v1');
assert.equal(pure.aiDifficulty, 'hard-rl-v1');
assert.equal(pure.aiExternalActions, 0);
assert.ok(pure.playerCommands.attack > 0, 'the pure scripted mirror must preserve the seed’s observed attack decisions');

assert.equal(wrapped.playerDifficulty, 'hard-rl-v1');
assert.equal(wrapped.aiDifficulty, 'hard-rl-v1');
assert.ok(wrapped.aiExternalActions >= seconds, 'the wrapper must inject at least one external action per nominal decision second');
assert.equal(wrapped.playerCommands.attack, 0, 'the wrapper path is diagnostic-only and must not be used as a reference trace');

console.log('PASS — pure scripted and RL-wrapper mirrors are isolated and demonstrably different.');
