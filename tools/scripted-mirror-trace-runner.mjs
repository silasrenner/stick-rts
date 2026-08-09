import { CONFIG } from '../src/config.js';
import { getRlActionIndex, getRlActionMask, getRlObservation } from '../src/rl/environment.js';
import { runTick } from '../src/sim/tick.js';
import { createWorld, isAliveEntity } from '../src/sim/world.js';

function teamSnapshot(world, team) {
  const living = (kind) => world.units.filter((unit) => unit.team === team && unit.kind === kind && isAliveEntity(unit)).length;
  return {
    coreHp: world.statues[team].hp,
    gold: world.teams[team].gold,
    command: world.teams[team].command,
    miners: living('miner'),
    warriors: living('warrior'),
    archers: living('archer'),
    losses: world.teams[team].losses,
    queue: world.teams[team].productionQueue.map((item) => item.action),
  };
}

function snapshot(world) {
  return { player: teamSnapshot(world, 'player'), ai: teamSnapshot(world, 'ai') };
}

export function runPureScriptedMirrorTrace({ seed, maxEpisodeSeconds = 600 } = {}) {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  const world = createWorld(seed);
  world.matchState = 'playing';
  world.teams.player.difficulty = 'hard-rl-v1';
  world.teams.ai.difficulty = 'hard-rl-v1';

  const decisions = [];
  let tick = 0;
  let combatContact = false;
  world.scriptedDecisionObserver = (event) => {
    if (event.team !== 'player') return;
    if (event.type === 'before') {
      event.world.pendingPlayerTrace = {
        tick,
        simulatedSeconds: event.simulatedSeconds,
        observation: getRlObservation(event.world, 'player'),
        actionMask: getRlActionMask(event.world, 'player'),
      };
      return;
    }
    if (event.type !== 'decision') return;
    const before = event.world.pendingPlayerTrace;
    if (!before) throw new Error('Missing player pre-decision trace state.');
    const actionIndex = getRlActionIndex(event.command, event.production);
    if (actionIndex < 0) throw new Error(`Unrepresentable scripted decision: ${event.command}/${event.production}`);
    decisions.push({
      ...before,
      team: 'player',
      actionIndex,
      action: { command: event.command, production: event.production },
      teacherRequestedProduction: event.requestedProduction,
      teacherPurchaseResult: event.purchaseResult,
      postDecisionSnapshot: snapshot(event.world),
    });
    delete event.world.pendingPlayerTrace;
  };

  const initial = snapshot(world);
  while (world.matchState === 'playing' && world.matchElapsedTime < maxEpisodeSeconds) {
    runTick(world, 1 / CONFIG.TICK_HZ);
    tick += 1;
    combatContact ||= world.units.some((unit) => unit.state === 'attacking');
  }
  const final = snapshot(world);
  const totalUnitLosses = final.player.losses + final.ai.losses;
  const totalCoreDamage = (initial.player.coreHp - final.player.coreHp) + (initial.ai.coreHp - final.ai.coreHp);
  const commands = Object.fromEntries(['defend', 'attack', 'retreat'].map((command) => [command, decisions.filter((decision) => decision.action.command === command).length]));

  return {
    schema: 'stick-rts-scripted-mirror-trace-v1',
    baseline: 'hard-rl-v1',
    matchup: 'hard-rl-v1-vs-hard-rl-v1',
    seed,
    decisions,
    summary: {
      commands,
      combatContact,
      totalUnitLosses,
      totalCoreDamage,
      terminalReason: world.matchState === 'playing' ? 'time-limit' : world.matchState,
      finalSnapshot: final,
      externalActionCount: 0,
    },
  };
}
