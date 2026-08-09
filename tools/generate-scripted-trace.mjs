import { existsSync, writeFileSync } from 'node:fs';
import { createRlEnvironment, getRlActionIndex, getRlActionMask, getRlObservation } from '../src/rl/environment.js';

export function generateScriptedTrace({ seed, maxEpisodeSeconds = 30, matchup = 'passive-opponent' } = {}) {
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  if (!['passive-opponent', 'mirror-hard-rl-v1'].includes(matchup)) throw new Error(`Unknown trace matchup: ${matchup}`);
  const mirror = matchup === 'mirror-hard-rl-v1';
  const pending = new Map();
  const decisions = [];
  const env = createRlEnvironment({
    team: 'ai',
    ownDifficulty: mirror ? 'hard-rl-v1' : null,
    opponentDifficulty: 'hard-rl-v1',
    decisionSeconds: 1,
    maxEpisodeSeconds,
    onScriptedDecision: (event) => {
      if (event.team !== 'player') return;
      if (event.type === 'before') {
        pending.set(event.team, {
          observation: getRlObservation(event.world, event.team),
          actionMask: getRlActionMask(event.world, event.team),
          simulatedSeconds: event.simulatedSeconds,
        });
        return;
      }
      if (event.type !== 'decision') return;
      const before = pending.get(event.team);
      if (!before) throw new Error(`Missing pre-decision state for ${event.team}.`);
      const actionIndex = getRlActionIndex(event.command, event.production);
      if (actionIndex < 0) throw new Error(`Unrepresentable scripted decision: ${event.command}/${event.production}`);
      decisions.push({
        ...before,
        team: event.team,
        actionIndex,
        action: { command: event.command, production: event.production },
        teacherRequestedProduction: event.requestedProduction,
        teacherPurchaseResult: event.purchaseResult,
      });
      pending.delete(event.team);
    },
  });

  const reset = env.reset(seed);
  const learnerAction = reset.actionMask.findIndex((isLegal, index) => isLegal && index === getRlActionIndex('defend', 'none'));
  if (learnerAction < 0) throw new Error('The passive replay opponent requires a legal defend/none action.');
  let transition = null;
  while (env.world.matchState === 'playing' && env.world.matchElapsedTime < maxEpisodeSeconds) {
    transition = env.step(learnerAction);
    if (transition.terminated || transition.truncated) break;
  }

  return {
    schema: 'stick-rts-scripted-trace-v1',
    baseline: 'hard-rl-v1',
    matchup,
    seed,
    decisions,
    terminalReason: transition?.terminalReason ?? null,
  };
}

export function writeScriptedTrace(outputPath, options) {
  if (existsSync(outputPath)) throw new Error(`Trace artifact already exists: ${outputPath}`);
  const trace = generateScriptedTrace(options);
  writeFileSync(outputPath, `${JSON.stringify(trace)}\n`, { encoding: 'utf8', flag: 'wx' });
  return trace;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  const seed = Number.parseInt(process.argv[2] ?? '26002', 10);
  process.stdout.write(`${JSON.stringify(generateScriptedTrace({ seed }))}\n`);
}
