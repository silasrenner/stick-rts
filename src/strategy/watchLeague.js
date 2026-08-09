import { isAliveEntity, isWatchAiMatch } from '../sim/world.js';
import { livingStructures, livingTurrets } from '../sim/systems/supply.js';

const GAME_TEAM_TO_LEAGUE_TEAM = { player: 'red', ai: 'blue' };
const LEAGUE_TEAMS = new Set(['red', 'blue']);
const PROFILE_STATUSES = new Set(['pending-provider', 'reviewed']);
// Mirror the persisted-profile limits at the browser boundary. The companion
// owns these values, but rejecting an unexpectedly malformed same-origin
// response here prevents it becoming commander context or completion
// telemetry if an older/corrupt companion is running.
const MAX_STRATEGY_REVISION = 1_000_000;
const MAX_PROFILE_SUMMARY_LENGTH = 800;
const PENDING_PROFILE_SUMMARY = 'No external strategy review has been applied.';

export function leagueTeamFor(gameTeam) {
  return GAME_TEAM_TO_LEAGUE_TEAM[gameTeam];
}

export function sanitizeStrategyProfile(profile, expectedTeam) {
  if (!profile || typeof profile !== 'object' || profile.team !== expectedTeam
    || !Number.isInteger(profile.revision) || profile.revision < 0 || profile.revision > MAX_STRATEGY_REVISION
    || !PROFILE_STATUSES.has(profile.status) || typeof profile.summary !== 'string') return null;
  // Keep the model context deliberately compact and data-only. Profiles are
  // created by the external review workflow, never from a browser endpoint.
  const summary = profile.summary.trim();
  if (!summary || summary.length > MAX_PROFILE_SUMMARY_LENGTH) return null;
  // `pending-provider` is only the explicit no-review sentinel. Do not allow
  // a malformed companion response to relabel arbitrary text as pending and
  // enter it into Local Gemma context. A reviewed profile must retain the
  // revision and timestamp created by the trusted offline workflow.
  if ((profile.status === 'pending-provider' && (profile.revision !== 0 || summary !== PENDING_PROFILE_SUMMARY || profile.updatedAt !== null))
    || (profile.status === 'reviewed' && (profile.revision < 1 || typeof profile.updatedAt !== 'string' || profile.updatedAt.length === 0 || profile.updatedAt.length > 64 || !Number.isFinite(Date.parse(profile.updatedAt))))) return null;
  return {
    team: expectedTeam,
    revision: profile.revision,
    status: profile.status,
    summary,
    updatedAt: profile.updatedAt,
  };
}

function composition(world, gameTeam) {
  const result = { miner: 0, warrior: 0, archer: 0, turret: livingTurrets(world, gameTeam).length, structure: livingStructures(world, gameTeam).length, forgemaster: 0, hawkeye: 0, vanguard: 0 };
  for (const unit of world.units) {
    if (unit.team === gameTeam && isAliveEntity(unit) && Object.hasOwn(result, unit.kind)) result[unit.kind] += 1;
  }
  return result;
}

export function buildCompletedWatchSummary(world, matchId = undefined) {
  if (!isWatchAiMatch(world) || !['won', 'lost'].includes(world.matchState)) return null;
  const winner = world.matchState === 'won' ? 'red' : 'blue';
  const teams = {};
  const strategyRevisions = {};
  for (const gameTeam of ['player', 'ai']) {
    const leagueTeam = leagueTeamFor(gameTeam);
    const state = world.teams[gameTeam];
    teams[leagueTeam] = {
      gold: state.gold,
      goldSpent: state.goldSpent ?? 0,
      losses: state.losses ?? 0,
      composition: composition(world, gameTeam),
    };
    strategyRevisions[leagueTeam] = state.strategyProfile?.revision ?? 0;
  }
  return { ...(matchId ? { matchId } : {}), winner, durationSeconds: Math.max(0, world.matchElapsedTime), teams, strategyRevisions };
}

// Completion telemetry is deliberately retried only a bounded number of times.
// Its opaque match id makes a retry safe when the companion persisted the match
// but the browser lost the response. Non-retryable 4xx responses remain a clear
// validation boundary rather than repeatedly sending malformed browser input.
export async function persistCompletedWatchSummary(summary, fetchImpl = fetch, {
  attempts = 3,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (!summary || !Number.isInteger(attempts) || attempts < 1) return false;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl('/api/league/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (response.ok) return true;
      // A bad request/conflict cannot be repaired by retransmission. Server
      // failures may be temporary, so retain the bounded retry path for 5xx.
      if (response.status < 500) return false;
    } catch {
      // A network interruption can occur after the companion write; retrying
      // the same match id is safe and lets the store deduplicate it.
    }
    if (attempt + 1 < attempts) await sleep(250 * (attempt + 1));
  }
  return false;
}

export async function loadOwnStrategyProfile(gameTeam, fetchImpl = fetch) {
  const leagueTeam = leagueTeamFor(gameTeam);
  if (!LEAGUE_TEAMS.has(leagueTeam)) return null;
  const response = await fetchImpl(`/api/league/strategy/${leagueTeam}`);
  if (!response.ok) throw new Error(`service ${response.status}`);
  return sanitizeStrategyProfile(await response.json(), leagueTeam);
}
