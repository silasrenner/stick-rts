import { CONFIG } from '../src/config.js';
import { createRlEnvironment, getRlActionIndex } from '../src/rl/environment.js';
import { runTick } from '../src/sim/tick.js';
import { createWorld } from '../src/sim/world.js';

function countCommands(events) {
  return Object.fromEntries(['defend', 'attack', 'retreat'].map((command) => [command, events.filter((event) => event.command === command).length]));
}

export function pureScriptedMirror(seed, seconds) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard-rl-v1';
  world.teams.ai.difficulty = 'hard-rl-v1';
  const events = [];
  world.scriptedDecisionObserver = (event) => {
    if (event.type === 'decision' && event.team === 'player') events.push(event);
  };
  for (let tick = 0; tick < seconds * CONFIG.TICK_HZ && world.matchState === 'playing'; tick += 1) runTick(world, 1 / CONFIG.TICK_HZ);
  return {
    playerCommands: countCommands(events),
    playerEvents: events.length,
    aiExternalActions: 0,
    playerDifficulty: world.teams.player.difficulty,
    aiDifficulty: world.teams.ai.difficulty,
  };
}

export function rlWrappedMirror(seed, seconds) {
  const events = [];
  const env = createRlEnvironment({
    team: 'ai',
    ownDifficulty: 'hard-rl-v1',
    opponentDifficulty: 'hard-rl-v1',
    decisionSeconds: 1,
    maxEpisodeSeconds: seconds,
    onScriptedDecision: (event) => {
      if (event.type === 'decision' && event.team === 'player') events.push(event);
    },
  });
  const reset = env.reset(seed);
  const defendNone = getRlActionIndex('defend', 'none');
  let transition = null;
  let aiExternalActions = 0;
  while (env.world.matchState === 'playing' && env.world.matchElapsedTime < seconds) {
    transition = env.step(defendNone);
    aiExternalActions += 1;
  }
  return {
    playerCommands: countCommands(events),
    playerEvents: events.length,
    aiExternalActions,
    playerDifficulty: env.world.teams.player.difficulty,
    aiDifficulty: env.world.teams.ai.difficulty,
  };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/rl-mirror-diagnostic.mjs')) {
  const seed = Number.parseInt(process.argv[2] ?? '26004', 10);
  const seconds = Number.parseInt(process.argv[3] ?? '90', 10);
  console.log(JSON.stringify({ seed, seconds, pureScriptedMirror: pureScriptedMirror(seed, seconds), rlWrappedMirror: rlWrappedMirror(seed, seconds) }));
}
