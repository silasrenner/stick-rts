// Local, bounded persistence for completed Watch matches. This is server-only:
// browser clients can record a completed summary and read aggregates, but cannot
// alter strategy profiles or emulate an external review.
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

export const LEAGUE_SCHEMA_VERSION = 1;
export const MAX_MATCH_HISTORY = 50;
// History is compact input from a browser, not an authoritative simulation
// save. Bound each scalar as well as the number of records so a malformed
// completion cannot permanently skew aggregate/review input with absurd data.
export const MAX_MATCH_DURATION_SECONDS = 24 * 60 * 60;
export const MAX_MATCH_ECONOMY = 1_000_000_000;
export const MAX_MATCH_COUNT = 100_000;
// Revisions are compact profile identifiers carried in browser completion
// telemetry. Bound them too: they are not authoritative browser state and an
// arbitrary huge integer would otherwise survive indefinitely in history.
export const MAX_STRATEGY_REVISION = 1_000_000;
const TEAMS = new Set(['red', 'blue']);
const COMPOSITION_KEYS = new Set(['miner', 'warrior', 'archer', 'turret', 'structure', 'forgemaster', 'hawkeye', 'vanguard']);
const MAX_PROFILE_SUMMARY_LENGTH = 800;
const PENDING_PROFILE_SUMMARY = 'No external strategy review has been applied.';
const MAX_MATCH_ID_LENGTH = 96;
// A process can die after creating the sidecar lock but before its finally
// block removes it.  Writes are tiny local operations, so a lock this old is
// not a live transaction; recover it rather than making Watch recording and
// trusted review application unavailable forever after an interrupted CLI.
const STALE_LOCK_MILLISECONDS = 60_000;
// Separate Node processes can all start from one Watch completion burst. On
// Windows, process startup and filesystem scheduling can take longer than the
// former two-second polling window even though each tiny transaction completes
// normally. Keep the local wait bounded, but long enough to serialize a short
// burst rather than dropping valid completed-match telemetry as "busy".
const LOCK_WAIT_ATTEMPTS = 1_000;
const LOCK_WAIT_MILLISECONDS = 10;

// A retry may repeat a completed summary, but a reused opaque id must never
// silently hide a different result. Keeping this distinct lets the HTTP
// boundary report a conflict rather than treating it as malformed telemetry.
export class MatchIdConflictError extends Error {
  constructor(matchId) {
    super(`matchId ${matchId} was already recorded for a different completed match.`);
    this.name = 'MatchIdConflictError';
  }
}

function emptyProfile(team) {
  return {
    team,
    revision: 0,
    status: 'pending-provider',
    summary: PENDING_PROFILE_SUMMARY,
    updatedAt: null,
  };
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 64 && Number.isFinite(Date.parse(value));
}

// Storage is local, but it can still be hand-edited or interrupted by an older
// build. Never surface an unvalidated persisted profile/match through the
// browser API or carry it into a future write.
function sanitizePersistedProfile(value, team) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Number.isInteger(value.revision) || value.revision < 0 || value.revision > MAX_STRATEGY_REVISION
    || !['pending-provider', 'reviewed'].includes(value.status)
    || typeof value.summary !== 'string') return emptyProfile(team);
  const summary = value.summary.trim();
  if (!summary || summary.length > MAX_PROFILE_SUMMARY_LENGTH) return emptyProfile(team);
  // Pending is a sentinel for an absent external review, not a second route
  // for arbitrary local text into the model. Reviewed profiles must have the
  // revision/timestamp produced by the trusted review application.
  if ((value.status === 'pending-provider' && (value.revision !== 0 || summary !== PENDING_PROFILE_SUMMARY || value.updatedAt !== null))
    || (value.status === 'reviewed' && (value.revision < 1 || !validTimestamp(value.updatedAt)))) return emptyProfile(team);
  return {
    team,
    revision: value.revision,
    status: value.status,
    summary,
    updatedAt: value.updatedAt,
  };
}

export function createEmptyLeague() {
  return {
    schemaVersion: LEAGUE_SCHEMA_VERSION,
    matches: [],
    profiles: { red: emptyProfile('red'), blue: emptyProfile('blue') },
  };
}

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function finiteWithin(value, maximum) {
  return finiteNonNegative(value) && value <= maximum;
}

function validateComposition(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const result = {};
  for (const [kind, count] of Object.entries(value)) {
    if (!COMPOSITION_KEYS.has(kind) || !Number.isInteger(count) || count < 0 || count > MAX_MATCH_COUNT) throw new Error(`${label}.${kind} must be a non-negative bounded integer.`);
    result[kind] = count;
  }
  return result;
}

// Intentionally accepts only completed, compact summaries. Match mechanics and
// legality remain in the deterministic client simulation.
export function normalizeCompletedMatch(input, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Match summary must be an object.');
  if (!TEAMS.has(input.winner)) throw new Error('winner must be red or blue.');
  if (!finiteWithin(input.durationSeconds, MAX_MATCH_DURATION_SECONDS)) throw new Error('durationSeconds must be a non-negative bounded number.');
  if (!input.teams || typeof input.teams !== 'object') throw new Error('teams must contain red and blue summaries.');
  const teams = {};
  for (const team of TEAMS) {
    const summary = input.teams[team];
    if (!summary || typeof summary !== 'object') throw new Error(`teams.${team} is required.`);
    if (!finiteWithin(summary.gold, MAX_MATCH_ECONOMY) || !finiteWithin(summary.goldSpent, MAX_MATCH_ECONOMY)
      || !Number.isInteger(summary.losses) || summary.losses < 0 || summary.losses > MAX_MATCH_COUNT) {
      throw new Error(`teams.${team} has invalid economy or losses.`);
    }
    teams[team] = {
      gold: summary.gold,
      goldSpent: summary.goldSpent,
      losses: summary.losses,
      composition: validateComposition(summary.composition ?? {}, `teams.${team}.composition`),
    };
  }
  const revisions = input.strategyRevisions ?? {};
  const strategyRevisions = {};
  for (const team of TEAMS) {
    const revision = revisions[team];
    if (!Number.isInteger(revision) || revision < 0 || revision > MAX_STRATEGY_REVISION) throw new Error(`strategyRevisions.${team} must be a non-negative bounded integer.`);
    strategyRevisions[team] = revision;
  }
  // New browser completions include an opaque per-match id so a retry after a
  // dropped response cannot inflate local history. Keep it optional while
  // reading v1 files written before idempotency existed.
  const matchId = input.matchId;
  if (matchId !== undefined && (typeof matchId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(matchId) || matchId.length < 8 || matchId.length > MAX_MATCH_ID_LENGTH)) {
    throw new Error('matchId must be a bounded opaque identifier.');
  }
  return { schemaVersion: LEAGUE_SCHEMA_VERSION, recordedAt: now, ...(matchId ? { matchId } : {}), winner: input.winner, durationSeconds: input.durationSeconds, teams, strategyRevisions };
}

function sameCompletedMatch(existing, incoming) {
  if (existing.winner !== incoming.winner || existing.durationSeconds !== incoming.durationSeconds) return false;
  for (const team of TEAMS) {
    const current = existing.teams[team];
    const candidate = incoming.teams[team];
    if (existing.strategyRevisions[team] !== incoming.strategyRevisions[team]
      || current.gold !== candidate.gold || current.goldSpent !== candidate.goldSpent || current.losses !== candidate.losses) return false;
    // Treat omitted composition types as zero, so a retried compact payload
    // remains equivalent even if its JSON serializer drops zero-value keys.
    for (const kind of COMPOSITION_KEYS) {
      if ((current.composition[kind] ?? 0) !== (candidate.composition[kind] ?? 0)) return false;
    }
  }
  return true;
}

function sanitizeLeague(value) {
  if (!value || value.schemaVersion !== LEAGUE_SCHEMA_VERSION || !Array.isArray(value.matches) || !value.profiles?.red || !value.profiles?.blue) return createEmptyLeague();
  const matches = [];
  const matchIds = new Set();
  for (const candidate of value.matches) {
    if (!candidate || candidate.schemaVersion !== LEAGUE_SCHEMA_VERSION || !validTimestamp(candidate.recordedAt)) continue;
    try {
      const normalized = normalizeCompletedMatch(candidate, candidate.recordedAt);
      // `record()` cannot create duplicate ids, but an interrupted/manual
      // storage edit must not turn one completed Watch world into multiple
      // history/review observations. Keep the earliest valid persisted entry:
      // it is the original result that a retry is required to reproduce.
      if (normalized.matchId && matchIds.has(normalized.matchId)) continue;
      if (normalized.matchId) matchIds.add(normalized.matchId);
      matches.push(normalized);
    } catch { /* discard corrupt historical entry */ }
  }
  return {
    schemaVersion: LEAGUE_SCHEMA_VERSION,
    matches: matches.slice(-MAX_MATCH_HISTORY),
    profiles: { red: sanitizePersistedProfile(value.profiles.red, 'red'), blue: sanitizePersistedProfile(value.profiles.blue, 'blue') },
  };
}

// A profile review is evidence-based, so bind it to the compact history it
// actually inspected as well as the profile revisions. This makes a review
// packet stale when a completed Watch match arrives while external review is
// in progress, even if neither profile has changed yet.
export function historyDigest(matches) {
  return createHash('sha256').update(JSON.stringify(matches)).digest('hex');
}

// This is a trusted workflow input, never a browser API payload. A review can
// only advance each team's revision and replace its compact strategy summary.
// It must also name the revisions it reviewed, so an older external review
// cannot silently overwrite a newer profile applied while it was in progress.
export function normalizeReviewedProfiles(input, currentProfiles, currentMatches, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !input.profiles || typeof input.profiles !== 'object') {
    throw new Error('Review must contain a profiles object.');
  }
  if (!input.basedOnRevisions || typeof input.basedOnRevisions !== 'object' || Array.isArray(input.basedOnRevisions)) {
    throw new Error('Review must contain basedOnRevisions from its review packet.');
  }
  const currentHistoryDigest = historyDigest(currentMatches);
  if (typeof input.basedOnHistoryDigest !== 'string' || !/^[a-f0-9]{64}$/.test(input.basedOnHistoryDigest)
    || input.basedOnHistoryDigest !== currentHistoryDigest) {
    throw new Error('Review is stale or missing basedOnHistoryDigest from its review packet.');
  }
  const profiles = {};
  for (const team of TEAMS) {
    const expectedRevision = currentProfiles[team]?.revision ?? 0;
    if (expectedRevision >= MAX_STRATEGY_REVISION) throw new Error(`Profile revision limit reached for ${team}.`);
    if (input.basedOnRevisions[team] !== expectedRevision) {
      throw new Error(`Review for ${team} is stale (expected revision ${expectedRevision}).`);
    }
    const review = input.profiles[team];
    if (!review || typeof review !== 'object' || Array.isArray(review) || typeof review.summary !== 'string') {
      throw new Error(`Review profile for ${team} requires a summary.`);
    }
    const summary = review.summary.trim();
    if (!summary || summary.length > MAX_PROFILE_SUMMARY_LENGTH) {
      throw new Error(`Review profile for ${team} must have a 1-${MAX_PROFILE_SUMMARY_LENGTH} character summary.`);
    }
    profiles[team] = {
      team,
      revision: (currentProfiles[team]?.revision ?? 0) + 1,
      status: 'reviewed',
      summary,
      updatedAt: now,
    };
  }
  return profiles;
}

export async function createLeagueStore(filePath) {
  // The companion can receive a completion from each Watch side in close
  // succession. Atomic rename prevents torn files, while this queue also
  // prevents two read-modify-write operations from silently losing one match
  // or a reviewed profile update.
  let pendingOperation = Promise.resolve();
  const lockPath = `${filePath}.lock`;
  // The preview server and the offline review CLI are separate Node processes.
  // The promise queue below covers calls within one process, but without a
  // small exclusive lock those two trusted local writers could both load the
  // same file and let the later atomic rename discard the earlier update.
  async function withWriteLock(operation) {
    let handle;
    for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
      try {
        await mkdir(dirname(filePath), { recursive: true });
        handle = await open(lockPath, 'wx');
        break;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        // Atomic rename protects file contents, but a stale sidecar from a
        // crashed separate process would otherwise reject every later write.
        // Only reclaim a lock far older than the bounded local transaction;
        // ENOENT simply means its owner released it between our checks.
        try {
          const lock = await stat(lockPath);
          if (Date.now() - lock.mtimeMs > STALE_LOCK_MILLISECONDS) {
            await unlink(lockPath).catch((unlinkError) => {
              if (unlinkError?.code !== 'ENOENT') throw unlinkError;
            });
            continue;
          }
        } catch (statError) {
          if (statError?.code !== 'ENOENT') throw statError;
        }
        await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MILLISECONDS));
      }
    }
    if (!handle) throw new Error('League storage is busy; another local writer did not release its lock.');
    try { return await operation(); }
    finally {
      await handle.close();
      await unlink(lockPath).catch((error) => { if (error?.code !== 'ENOENT') throw error; });
    }
  }
  function serialize(operation) {
    const result = pendingOperation.then(() => withWriteLock(operation));
    // Keep the queue usable after a rejected validation/write operation while
    // still returning that rejection to its caller.
    pendingOperation = result.catch(() => {});
    return result;
  }
  async function load() {
    try { return sanitizeLeague(JSON.parse(await readFile(filePath, 'utf8'))); }
    catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) return createEmptyLeague();
      throw error;
    }
  }
  async function save(league) {
    await mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(league, null, 2)}\n`, 'utf8');
    await rename(temporary, filePath);
  }
  return {
    async record(match) {
      return serialize(async () => {
        const league = await load();
        const normalized = normalizeCompletedMatch(match);
        // A completion POST is allowed to be retried by the browser/network.
        // Return the original record instead of storing a duplicate. Old
        // records without ids remain readable but intentionally cannot dedupe.
        if (normalized.matchId) {
          const existing = league.matches.find((entry) => entry.matchId === normalized.matchId);
          if (existing) {
            if (!sameCompletedMatch(existing, normalized)) throw new MatchIdConflictError(normalized.matchId);
            return existing;
          }
        }
        league.matches.push(normalized);
        league.matches = league.matches.slice(-MAX_MATCH_HISTORY);
        await save(league);
        return league.matches.at(-1);
      });
    },
    async snapshot() {
      await pendingOperation;
      const league = await load();
      const wins = { red: 0, blue: 0 };
      for (const match of league.matches) if (TEAMS.has(match.winner)) wins[match.winner] += 1;
      return { schemaVersion: LEAGUE_SCHEMA_VERSION, aggregate: { matches: league.matches.length, wins }, recent: league.matches.slice(-10).reverse(), profiles: league.profiles };
    },
    // This trusted-only projection is for an externally run OpenAI/Codex
    // review, not a companion HTTP route. It intentionally contains the full
    // (but still capped) compact history so the reviewer can cite evidence
    // when updating both independent profiles.
    async reviewPacket() {
      await pendingOperation;
      const league = await load();
      const wins = { red: 0, blue: 0 };
      for (const match of league.matches) if (TEAMS.has(match.winner)) wins[match.winner] += 1;
      return {
        schemaVersion: LEAGUE_SCHEMA_VERSION,
        aggregate: { matches: league.matches.length, wins },
        // Review input must carry these values back unchanged. They bind an
        // external review to the exact independent profile revisions it read.
        basedOnRevisions: { red: league.profiles.red.revision, blue: league.profiles.blue.revision },
        basedOnHistoryDigest: historyDigest(league.matches),
        profiles: league.profiles,
        history: league.matches.slice().reverse(),
      };
    },
    async applyReviewedProfiles(review) {
      return serialize(async () => {
        const league = await load();
        league.profiles = normalizeReviewedProfiles(review, league.profiles, league.matches);
        await save(league);
        return league.profiles;
      });
    },
  };
}
