import { buildLeagueHistoryView } from '../src/strategy/historyView.js';

const snapshot = {
  aggregate: { matches: 3, wins: { red: 2, blue: 1 } },
  profiles: {
    red: { revision: 4, status: 'reviewed', summary: 'Hold mine, then advance.' },
    blue: { revision: 0, status: 'pending-provider', summary: 'No external strategy review has been applied.' },
  },
  recent: [
    { winner: 'blue', durationSeconds: 65, recordedAt: '2026-07-28T00:00:00.000Z' },
    { winner: 'red', durationSeconds: 3 },
    { winner: 'invalid', durationSeconds: 4 },
  ],
};
const view = buildLeagueHistoryView(snapshot);
if (!view || view.matches !== 3 || view.wins.red !== 2 || view.profiles.red.revision !== 4
  || view.profiles.blue.status !== 'pending-provider' || view.recent.length !== 2
  || view.recent[0].duration !== '01:05' || view.recent[1].duration !== '00:03') {
  throw new Error(`History projection is incorrect: ${JSON.stringify(view)}`);
}
if (buildLeagueHistoryView({ aggregate: { matches: 0, wins: { red: 0, blue: 0 } } }) !== null) {
  throw new Error('Incomplete companion snapshot must not render as valid history.');
}
console.log('PASS — League history view safely projects aggregate wins, recent results, and profile status.');
