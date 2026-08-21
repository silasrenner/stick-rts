import { mkdir, writeFile } from 'node:fs/promises';
import { CONFIG } from '../src/config.js';
import { runTick } from '../src/sim/tick.js';
import { createWorld } from '../src/sim/world.js';

const outDir = new URL('./hard-ai-raven-diagnostic/', import.meta.url);
await mkdir(outDir, { recursive: true });
const seeds = [701, 702, 703, 704, 705];
const maxTicks = 180_000;
const dt = 1 / CONFIG.TICK_HZ;

function compactDecision(record) {
  const raven = record?.candidates?.find(({ candidate }) => candidate.action === 'raven') ?? null;
  const normal = record?.selection?.candidate?.action === 'unit' ? record.selection : null;
  return {
    time: record?.time ?? null,
    goal: record?.goal ?? null,
    selection: record?.selection ? {
      source: record.selection.source,
      candidate: record.selection.candidate,
      utility: record.selection.utility,
      result: record.selection.result,
    } : null,
    raven,
    normal,
    information: record?.observed?.information ?? null,
    estimatedEnemyPower: record?.observed?.defense?.estimatedEnemyPower ?? null,
    composition: record?.observed?.enemyMemory?.composition ?? {},
  };
}

function createMatch(seed) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard';
  world.teams.ai.difficulty = 'hard';
  return world;
}

function teamEvents(world, eventsByRaven, previousSelections) {
  for (const team of ['player', 'ai']) {
    const record = world.teams[team].lastAiDecision;
    if (record && record !== previousSelections[team]) {
      previousSelections[team] = record;
      if (record.selection?.source === 'raven-utility' && record.selection.result?.ok) {
        const raven = world.ravens.find((entry) => entry.team === team);
        if (raven) {
          eventsByRaven.set(raven.id, {
            team,
            ravenId: raven.id,
            purchase: compactDecision(record),
            reveal: null,
            laterDecision: null,
          });
        }
      }
      for (const event of eventsByRaven.values()) {
        if (event.team === team && event.reveal && !event.laterDecision && record.selection?.candidate?.action === 'unit') {
          event.laterDecision = compactDecision(record);
        }
      }
    }
  }
}

function recordReveals(world, eventsByRaven) {
  for (const raven of world.ravens) {
    const event = eventsByRaven.get(raven.id);
    if (!event || event.reveal || raven.state !== 'revealing') continue;
    const memory = world.aiMemory[raven.team] ?? {};
    const record = world.teams[raven.team].lastAiDecision;
    event.reveal = {
      time: world.matchElapsedTime,
      state: raven.state,
      visibleComposition: memory.currentlyVisibleComposition ?? {},
      observedComposition: memory.composition ?? {},
      currentlyVisibleEnemyCount: memory.currentlyVisibleEnemies?.length ?? 0,
      estimatedEnemyPower: record?.observed?.defense?.estimatedEnemyPower ?? null,
      information: record?.observed?.information ?? null,
    };
  }
}

const cohort = [];
for (const seed of seeds) {
  const world = createMatch(seed);
  const eventsByRaven = new Map();
  const previousSelections = { player: null, ai: null };
  let ticks = 0;
  for (; ticks < maxTicks && world.matchState === 'playing'; ticks += 1) {
    runTick(world, dt);
    teamEvents(world, eventsByRaven, previousSelections);
    recordReveals(world, eventsByRaven);
  }
  const outcome = world.matchState === 'won' ? 'player' : world.matchState === 'lost' ? 'ai' : 'unresolved';
  const result = {
    seed,
    outcome,
    durationSeconds: Number((ticks / CONFIG.TICK_HZ).toFixed(3)),
    ravens: [...eventsByRaven.values()],
  };
  cohort.push(result);
  await writeFile(new URL(`seed-${seed}.json`, outDir), `${JSON.stringify(result, null, 2)}\n`);
}

const totals = cohort.reduce((summary, result) => {
  summary[result.outcome] += 1;
  summary.ravenPurchases += result.ravens.length;
  for (const raven of result.ravens) summary.byTeam[raven.team] += 1;
  return summary;
}, { player: 0, ai: 0, unresolved: 0, ravenPurchases: 0, byTeam: { player: 0, ai: 0 } });
const report = { seeds, maxSeconds: maxTicks / CONFIG.TICK_HZ, totals, cohort };
await writeFile(new URL('summary.json', outDir), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals, outcomes: cohort.map(({ seed, outcome, durationSeconds, ravens }) => ({ seed, outcome, durationSeconds, ravenPurchases: ravens.length })) }, null, 2));
