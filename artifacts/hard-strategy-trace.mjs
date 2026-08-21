import { CONFIG } from '../src/config.js';
import { createWorld, isAliveEntity } from '../src/sim/world.js';
import { runTick } from '../src/sim/tick.js';

const seed = Number(process.argv[2] ?? 701);
const maxSeconds = Number(process.argv[3] ?? 3000);
const milestones = [60, 120, 240, 300, 600, 900];
const world = createWorld(seed);
world.matchState = 'playing';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
const teams = ['player', 'ai'];
const trace = Object.fromEntries(teams.map((team) => [team, {
  firstAttack: null,
  purchases: { miner: 0, warrior: 0, archer: 0 },
  transitions: [],
  decisions: [],
  milestones: {},
  maxGold: 0,
}]));
const lastCommand = Object.fromEntries(teams.map((team) => [team, world.teams[team].command]));
const lastDecisionTime = Object.fromEntries(teams.map((team) => [team, null]));

function living(team) {
  const counts = { miner: 0, warrior: 0, archer: 0, hero: 0 };
  for (const unit of world.units) {
    if (unit.team !== team || !isAliveEntity(unit)) continue;
    if (unit.isHero) counts.hero += 1;
    else if (unit.kind in counts) counts[unit.kind] += 1;
  }
  return { ...counts, combat: counts.warrior + counts.archer + counts.hero };
}

function snapshot(team) {
  const state = world.teams[team];
  return { gold: Math.round(state.gold), living: living(team), command: state.command, goal: state.strategicGoal };
}

const maxTicks = maxSeconds * CONFIG.TICK_HZ;
for (let tick = 0; tick < maxTicks && world.matchState === 'playing'; tick += 1) {
  runTick(world, 1 / CONFIG.TICK_HZ);
  const now = world.matchElapsedTime;
  for (const team of teams) {
    const state = world.teams[team];
    trace[team].maxGold = Math.max(trace[team].maxGold, state.gold);
    if (state.command !== lastCommand[team]) {
      trace[team].transitions.push({ time: Number(now.toFixed(1)), from: lastCommand[team], to: state.command, combat: living(team).combat });
      lastCommand[team] = state.command;
      if (state.command === 'attack' && trace[team].firstAttack === null) {
        trace[team].firstAttack = { time: Number(now.toFixed(1)), combat: living(team).combat };
      }
    }
    const record = state.lastAiDecision;
    if (record && record.time !== lastDecisionTime[team]) {
      lastDecisionTime[team] = record.time;
      const selected = record.selection?.candidate?.kind;
      if (record.selection?.result?.ok && selected in trace[team].purchases) trace[team].purchases[selected] += 1;
      if (record.attackCommitment?.state !== 'not-attacking' || (record.goal === 'attack' && selected)) {
        trace[team].decisions.push({
          time: Number(record.time.toFixed(1)), goal: record.goal, combat: record.attackCommitment?.combatUnits,
          commitment: record.attackCommitment?.state, sustainReason: record.attackCommitment?.sustainReason ?? null, gold: Math.round(record.observed.gold), miners: record.observed.living.miner,
          selected, utility: record.selection?.utility,
        });
      }
    }
  }
  for (const at of milestones) {
    if (now >= at && !trace.player.milestones[at]) {
      for (const team of teams) trace[team].milestones[at] = snapshot(team);
    }
  }
}

for (const team of teams) trace[team].final = snapshot(team);
console.log(JSON.stringify({ seed, maxSeconds, outcome: world.matchState, duration: Number(world.matchElapsedTime.toFixed(1)), trace }, null, 2));
