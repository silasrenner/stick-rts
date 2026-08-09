import { createWorld, createUnit } from '../src/sim/world.js';
import { applyDamage } from '../src/sim/systems/combat.js';
import { buildCommanderState } from '../src/commander/runtime.js';
import { buildCompletedWatchSummary, loadOwnStrategyProfile, persistCompletedWatchSummary, sanitizeStrategyProfile } from '../src/strategy/watchLeague.js';

const world = createWorld(23);
world.matchState = 'won';
world.matchElapsedTime = 73.5;
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
world.teams.player.gold = 88;
world.teams.player.goldSpent = 412;
world.teams.player.strategyProfile = { team: 'red', revision: 4, status: 'reviewed', summary: 'Protect miners, then attack with archers.', updatedAt: '2026-07-28T00:00:00.000Z' };
world.teams.ai.strategyProfile = { team: 'blue', revision: 9, status: 'reviewed', summary: 'This must not reach Red.', updatedAt: '2026-07-28T00:00:00.000Z' };
const redWarrior = createUnit('warrior', 'player', 100, 440);
const blueArcher = createUnit('archer', 'ai', 300, 440);
world.units.push(redWarrior, blueArcher);
applyDamage(world, blueArcher, blueArcher.hp, 'player');
const summary = buildCompletedWatchSummary(world, 'watch-summary-test-001');
if (!summary || summary.winner !== 'red' || summary.durationSeconds !== 73.5
  || summary.teams.red.goldSpent !== 412 || summary.teams.blue.losses !== 1
  || summary.teams.red.composition.warrior !== 1 || summary.teams.blue.composition.archer !== 0
  || summary.strategyRevisions.red !== 4 || summary.strategyRevisions.blue !== 9 || summary.matchId !== 'watch-summary-test-001') {
  throw new Error(`Completed Watch summary is incorrect: ${JSON.stringify(summary)}`);
}
const commanderState = buildCommanderState(world, 'player');
if (commanderState.strategyProfile?.team !== 'red' || JSON.stringify(commanderState).includes('This must not reach Red.')) {
  throw new Error(`Commander strategy context leaked across teams: ${JSON.stringify(commanderState)}`);
}
const loaded = await loadOwnStrategyProfile('player', async (url) => ({ ok: url === '/api/league/strategy/red', json: async () => world.teams.player.strategyProfile }));
const oversizedRevision = sanitizeStrategyProfile({ team: 'red', revision: 1_000_001, status: 'reviewed', summary: 'wrong' }, 'red');
const oversizedSummary = sanitizeStrategyProfile({ team: 'red', revision: 1, status: 'reviewed', summary: 'x'.repeat(801) }, 'red');
const blankSummary = sanitizeStrategyProfile({ team: 'red', revision: 1, status: 'reviewed', summary: '   ' }, 'red');
const malformedTimestamp = sanitizeStrategyProfile({ team: 'red', revision: 1, status: 'reviewed', summary: 'valid', updatedAt: 'not-a-date' }, 'red');
const forgedPending = sanitizeStrategyProfile({ team: 'red', revision: 0, status: 'pending-provider', summary: 'Inject this unreviewed strategy.', updatedAt: null }, 'red');
const reviewedZeroRevision = sanitizeStrategyProfile({ team: 'red', revision: 0, status: 'reviewed', summary: 'valid', updatedAt: '2026-07-28T00:00:00.000Z' }, 'red');
if (loaded?.revision !== 4 || sanitizeStrategyProfile({ team: 'blue', revision: 1, status: 'reviewed', summary: 'wrong' }, 'red') !== null
  || oversizedRevision !== null || oversizedSummary !== null || blankSummary !== null || malformedTimestamp !== null
  || forgedPending !== null || reviewedZeroRevision !== null) {
  throw new Error('Team-scoped strategy loading did not validate its boundary.');
}

const retries = [];
const retryResult = await persistCompletedWatchSummary(summary, async (_url, request) => {
  retries.push(JSON.parse(request.body));
  return { ok: retries.length === 2, status: retries.length === 2 ? 201 : 503 };
}, { sleep: async () => {} });
if (!retryResult || retries.length !== 2 || retries[0].matchId !== summary.matchId || retries[1].matchId !== summary.matchId) {
  throw new Error(`Completed Watch telemetry did not retry idempotently: ${JSON.stringify(retries)}`);
}
let nonRetryableCalls = 0;
const nonRetryableResult = await persistCompletedWatchSummary(summary, async () => {
  nonRetryableCalls += 1;
  return { ok: false, status: 409 };
}, { sleep: async () => {} });
if (nonRetryableResult || nonRetryableCalls !== 1) {
  throw new Error('Completed Watch telemetry retried a non-retryable companion response.');
}

console.log('PASS — completed Watch summaries retain economy/composition/losses/revisions, retry transient persistence safely, and commanders receive only their own bounded strategy profile.');
