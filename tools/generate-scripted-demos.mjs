import { writeFile } from 'node:fs/promises';
import { createWorld } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';
import { CONFIG } from '../src/config.js';
import { getRlActionIndex, getRlObservation } from '../src/rl/environment.js';

const args = process.argv.slice(2);
const seedsIndex = args.indexOf('--seeds');
const outputIndex = args.indexOf('--output');
const seedCount = seedsIndex >= 0 ? Number(args[seedsIndex + 1]) : 8;
const output = outputIndex >= 0 ? args[outputIndex + 1] : 'training/artifacts/scripted-demonstrations.jsonl';
if (!Number.isInteger(seedCount) || seedCount < 1 || !output) throw new Error('Usage: --seeds <positive integer> --output <path>');

const commandTarget = { attack: 'attack-enemy-core', defend: 'hold-own-mine', retreat: 'retreat-home' };
const allowedProduction = new Set(['miner', 'warrior', 'archer', 'structure', 'turret']);
const entries = [];

for (let offset = 0; offset < seedCount; offset += 1) {
  const seed = 20000 + offset;
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard';
  world.teams.ai.difficulty = 'hard';
  for (let tick = 0; tick < CONFIG.TICK_HZ * 300 && world.matchState === 'playing'; tick += 1) {
    const before = Object.fromEntries(['player', 'ai'].map((team) => [team, {
      observation: getRlObservation(world, team),
      queueLength: world.teams[team].productionQueue.length,
      command: world.teams[team].command,
    }]));
    runTick(world, 1 / CONFIG.TICK_HZ);
    for (const team of ['player', 'ai']) {
      const produced = world.teams[team].productionQueue[before[team].queueLength];
      if (!produced || !allowedProduction.has(produced.kind)) continue;
      const targetIntent = commandTarget[world.teams[team].command] ?? commandTarget[before[team].command];
      const action = getRlActionIndex(targetIntent, produced.kind);
      if (action < 0) throw new Error(`No RL mapping for ${targetIntent}/${produced.kind}`);
      entries.push({ schema: 'stick-rts-demo-v1', seed, team, tick, observation: before[team].observation, action, targetIntent, production: produced.kind });
    }
  }
}
await writeFile(output, `${entries.map(JSON.stringify).join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ output, demonstrations: entries.length, seeds: seedCount }));
