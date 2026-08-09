import assert from 'node:assert/strict';
import { createRlEnvironment, getRlObservation } from '../src/rl/environment.js';

const env = createRlEnvironment();
env.reset(23001);

const defend = getRlObservation(env.world, 'player');
env.world.teams.player.command = 'attack';
const attack = getRlObservation(env.world, 'player');

assert.equal(defend.length, 35, 'the v2 policy observation must expose the approved fixed 35-value contract');
assert.notDeepEqual(
  defend,
  attack,
  'the policy observation must distinguish otherwise-equal worlds with defend versus attack as the active command',
);

console.log('PASS — v2 RL observation exposes the approved command-aware contract.');
