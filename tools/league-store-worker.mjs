// One completion writer used only by league-store-check's true multi-process
// persistence regression. The companion and offline review CLI run in separate
// Node processes, so this must not share an in-memory store queue with its
// parent test process.
import { createLeagueStore } from '../src/strategy/leagueStore.js';

const [filePath, rawIndex] = process.argv.slice(2);
const index = Number(rawIndex);
if (!filePath || !Number.isInteger(index) || index < 0) throw new Error('Usage: node tools/league-store-worker.mjs league.json non-negative-index');

const store = await createLeagueStore(filePath);
await store.record({
  matchId: `watch-multiprocess-${index}`,
  winner: index % 2 ? 'blue' : 'red',
  durationSeconds: 4_000 + index,
  strategyRevisions: { red: 0, blue: 0 },
  teams: {
    red: { gold: 125, goldSpent: 450, losses: 3, composition: { miner: 2, warrior: 5 } },
    blue: { gold: 40, goldSpent: 400, losses: 7, composition: { archer: 4, turret: 1 } },
  },
});