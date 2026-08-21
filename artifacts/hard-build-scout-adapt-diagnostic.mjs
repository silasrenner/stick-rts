import { mkdir, writeFile } from 'node:fs/promises';
import { CONFIG } from '../src/config.js';
import { runTick } from '../src/sim/tick.js';
import { createWorld, isAliveEntity } from '../src/sim/world.js';

const outDir = new URL('./hard-build-scout-adapt-diagnostic/', import.meta.url);
await mkdir(outDir, { recursive: true });
const seeds = process.argv.slice(2).map(Number).filter(Number.isFinite);
const cohortSeeds = seeds.length > 0 ? seeds : [701, 702, 703, 704, 705, 706, 707, 708, 709, 710];
const maxSeconds = 3000;
const maxTicks = maxSeconds * CONFIG.TICK_HZ;
const dt = 1 / CONFIG.TICK_HZ;
const teams = ['player', 'ai'];

function living(world, team) {
  const counts = { miner: 0, warrior: 0, archer: 0, hero: 0 };
  for (const unit of world.units) {
    if (unit.team !== team || !isAliveEntity(unit)) continue;
    if (unit.isHero) counts.hero += 1;
    else if (unit.kind in counts) counts[unit.kind] += 1;
  }
  return { ...counts, combat: counts.warrior + counts.archer + counts.hero };
}

function known(record) {
  return record?.observed?.enemyMemory?.composition ?? {};
}

function snapshot(world, team, record = world.teams[team].lastAiDecision) {
  const counts = living(world, team);
  const raven = record?.candidates?.find(({ candidate }) => candidate.action === 'raven');
  return {
    time: Number(world.matchElapsedTime.toFixed(3)),
    combat: counts.combat,
    miners: counts.miner,
    warriors: counts.warrior,
    archers: counts.archer,
    heroes: counts.hero,
    gold: Math.round(world.teams[team].gold),
    goal: world.teams[team].strategicGoal,
    command: world.teams[team].command,
    armyBuildProgress: record?.observed?.armyBuildProgress ?? null,
    scoutingNeed: record?.observed?.information?.scoutingNeed ?? null,
    knownEnemyComposition: known(record),
    counterPreference: record?.selection?.counterKind ?? null,
    raven: raven ? {
      feasible: raven.feasibility?.feasible,
      reason: raven.feasibility?.reason,
      utility: raven.utility?.weightedTotal ?? null,
      timing: raven.utility?.scoutingTimingMultiplier ?? null,
      affordability: raven.utility?.scoutingAffordability ?? null,
      selected: raven.utility?.selected ?? false,
    } : null,
  };
}

function sumEnemyStructureHp(world, team) {
  const enemy = team === 'player' ? 'ai' : 'player';
  const structures = world.structures.filter((entry) => entry.team === enemy && isAliveEntity(entry));
  return structures.reduce((sum, entry) => sum + entry.hp, 0) + (isAliveEntity(world.statues[enemy]) ? world.statues[enemy].hp : 0);
}

function hasMajorContact(world, team) {
  const enemy = team === 'player' ? 'ai' : 'player';
  const own = world.units.filter((unit) => unit.team === team && !unit.isMiner && isAliveEntity(unit));
  const opposing = world.units.filter((unit) => unit.team === enemy && !unit.isMiner && isAliveEntity(unit));
  return own.length >= 3 && opposing.length >= 3
    && own.some((unit) => opposing.some((other) => Math.abs(unit.x - other.x) <= 320));
}

function createTrace(seed) {
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard';
  world.teams.ai.difficulty = 'hard';
  const trace = Object.fromEntries(teams.map((team) => [team, {
    milestones: {}, attacks: [], ravens: [], firstMajorContact: null,
    initialEnemyStructureHp: sumEnemyStructureHp(world, team), firstStructureDamage: null,
    minCombatAfterLaunch: null, maxCombatAfterLaunch: 0,
  }]));
  const lastRecord = { player: null, ai: null };
  const priorCommand = { player: 'defend', ai: 'defend' };
  const ravenById = new Map();
  const crossings = [[0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, 'ready']];

  let ticks = 0;
  for (; ticks < maxTicks && world.matchState === 'playing'; ticks += 1) {
    runTick(world, dt);
    for (const team of teams) {
      const record = world.teams[team].lastAiDecision;
      const counts = living(world, team);
      const teamTrace = trace[team];
      if (world.teams[team].command === 'attack') {
        teamTrace.maxCombatAfterLaunch = Math.max(teamTrace.maxCombatAfterLaunch, counts.combat);
        teamTrace.minCombatAfterLaunch = teamTrace.minCombatAfterLaunch === null
          ? counts.combat : Math.min(teamTrace.minCombatAfterLaunch, counts.combat);
      }
      if (world.teams[team].command !== priorCommand[team]) {
        if (world.teams[team].command === 'attack') teamTrace.attacks.push(snapshot(world, team, record));
        priorCommand[team] = world.teams[team].command;
      }
      if (!teamTrace.firstMajorContact && hasMajorContact(world, team)) teamTrace.firstMajorContact = snapshot(world, team, record);
      const structureHp = sumEnemyStructureHp(world, team);
      if (!teamTrace.firstStructureDamage && structureHp < teamTrace.initialEnemyStructureHp) {
        teamTrace.firstStructureDamage = { ...snapshot(world, team, record), remainingEnemyStructureHp: structureHp };
      }
      if (record && record !== lastRecord[team]) {
        lastRecord[team] = record;
        const progress = record.observed?.armyBuildProgress ?? 0;
        for (const [threshold, label] of crossings) {
          if (!teamTrace.milestones[label] && progress >= threshold) teamTrace.milestones[label] = snapshot(world, team, record);
        }
        if (record.selection?.source === 'raven-utility' && record.selection?.result?.ok) {
          const raven = world.ravens.find((entry) => entry.team === team);
          if (raven) {
            const event = { purchase: snapshot(world, team, record), reveal: null, nextNormalPurchases: [] };
            teamTrace.ravens.push(event);
            ravenById.set(raven.id, { team, event });
          }
        }
        for (const event of teamTrace.ravens) {
          if (event.reveal && event.nextNormalPurchases.length < 8 && record.selection?.candidate?.action === 'unit' && record.selection?.result?.ok) {
            event.nextNormalPurchases.push({ ...snapshot(world, team, record), selected: record.selection.candidate.kind });
          }
        }
      }
    }
    for (const raven of world.ravens) {
      const owned = ravenById.get(raven.id);
      if (owned && raven.state === 'revealing' && !owned.event.reveal) {
        owned.event.reveal = snapshot(world, owned.team);
      }
    }
  }
  const result = {
    seed,
    outcome: world.matchState === 'won' ? 'player' : world.matchState === 'lost' ? 'ai' : 'unresolved',
    durationSeconds: Number((ticks / CONFIG.TICK_HZ).toFixed(3)),
    trace,
    final: Object.fromEntries(teams.map((team) => [team, snapshot(world, team)])),
  };
  return result;
}

const results = [];
for (const seed of cohortSeeds) {
  const result = createTrace(seed);
  results.push(result);
  await writeFile(new URL(`seed-${seed}.json`, outDir), `${JSON.stringify(result, null, 2)}\n`);
}
const summary = results.reduce((acc, result) => {
  acc.outcomes[result.outcome] += 1;
  for (const team of teams) {
    const trace = result.trace[team];
    acc.ravens[team] += trace.ravens.length;
    acc.launches[team] += trace.attacks.length;
    if (trace.firstMajorContact) acc.majorContacts[team] += 1;
    if (trace.firstStructureDamage) acc.structureDamageCases[team] += 1;
  }
  return acc;
}, { seeds: cohortSeeds, maxSeconds, outcomes: { player: 0, ai: 0, unresolved: 0 }, ravens: { player: 0, ai: 0 }, launches: { player: 0, ai: 0 }, majorContacts: { player: 0, ai: 0 }, structureDamageCases: { player: 0, ai: 0 } });
const report = { summary, results };
await writeFile(new URL('summary.json', outDir), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
