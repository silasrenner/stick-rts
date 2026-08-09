import { formatMatchClock } from '../render/matchTelemetry.js';

// Browser-safe projection of the bounded companion snapshot. It deliberately
// exposes only aggregate/history display data, never model context.
export function buildLeagueHistoryView(snapshot) {
  const aggregate = snapshot?.aggregate;
  const profiles = snapshot?.profiles;
  if (!aggregate || !profiles || !Number.isInteger(aggregate.matches)
    || !Number.isInteger(aggregate.wins?.red) || !Number.isInteger(aggregate.wins?.blue)) return null;

  const profile = (team) => ({
    revision: Number.isInteger(profiles[team]?.revision) ? profiles[team].revision : 0,
    status: profiles[team]?.status === 'reviewed' ? 'reviewed' : 'pending-provider',
    summary: typeof profiles[team]?.summary === 'string' ? profiles[team].summary.slice(0, 120) : 'No strategy profile available.',
  });
  const recent = Array.isArray(snapshot.recent) ? snapshot.recent.slice(0, 5).flatMap((match) => {
    if (!['red', 'blue'].includes(match?.winner) || typeof match.durationSeconds !== 'number') return [];
    return [{ winner: match.winner, duration: formatMatchClock(match.durationSeconds), recordedAt: typeof match.recordedAt === 'string' ? match.recordedAt : null }];
  }) : [];
  return { matches: aggregate.matches, wins: aggregate.wins, profiles: { red: profile('red'), blue: profile('blue') }, recent };
}
