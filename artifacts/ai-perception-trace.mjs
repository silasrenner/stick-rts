import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.env.SIM_ROOT ?? process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(root, relativePath)).href);
const seed = Number(process.env.SEED ?? 701);
const maxSeconds = Number(process.env.MAX_SECONDS ?? 900);
const checkpointSeconds = Number(process.env.CHECKPOINT_SECONDS ?? 60);
const { createWorld, isAliveEntity } = await load('src/sim/world.js');
const { runTick } = await load('src/sim/tick.js');

function unitCounts(world, team) {
  const counts = {};
  for (const unit of world.units) {
    if (unit.team !== team || !isAliveEntity(unit)) continue;
    counts[unit.kind] = (counts[unit.kind] ?? 0) + 1;
  }
  return counts;
}

function summarizeTeam(world, team) {
  const state = world.teams[team];
  const memory = world.aiMemory[team] ?? {};
  return {
    command: state.command,
    goal: state.strategicGoal,
    gold: Math.round(state.gold),
    buildIndex: state.buildIndex,
    units: unitCounts(world, team),
    queue: state.productionQueue.map((item) => item.kind),
    visible: (memory.currentlyVisibleEnemies ?? []).map((entry) => `${entry.kind}@${Math.round(entry.x)}`),
    remembered: (memory.rememberedEnemyUnits ?? []).map((entry) => `${entry.kind}@${Math.round(entry.x)}:${(world.matchElapsedTime - entry.lastSeenAt).toFixed(1)}`),
    composition: memory.composition ?? {},
    defense: state.lastAiDecision?.observed?.defense ?? null,
    selection: state.lastAiDecision?.selection ? {
      kind: state.lastAiDecision.selection.candidate?.kind ?? null,
      source: state.lastAiDecision.selection.source,
      counterKind: state.lastAiDecision.selection.counterKind,
      result: state.lastAiDecision.selection.result,
    } : null,
  };
}

const world = createWorld(seed);
world.matchState = 'playing';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
const dt = 1 / 60;
const output = [];
for (let tick = 0; tick <= maxSeconds * 60 && world.matchState === 'playing'; tick += 1) {
  if (tick % (checkpointSeconds * 60) === 0) {
    output.push({ time: Number(world.matchElapsedTime.toFixed(1)), player: summarizeTeam(world, 'player'), ai: summarizeTeam(world, 'ai') });
  }
  runTick(world, dt);
}
output.push({ time: Number(world.matchElapsedTime.toFixed(1)), final: true, matchState: world.matchState, player: summarizeTeam(world, 'player'), ai: summarizeTeam(world, 'ai') });
console.log(JSON.stringify({ root, seed, maxSeconds, checkpointSeconds, output }, null, 2));
