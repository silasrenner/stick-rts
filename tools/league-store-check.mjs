import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAX_MATCH_COUNT,
  MAX_MATCH_DURATION_SECONDS,
  MAX_MATCH_ECONOMY,
  MAX_MATCH_HISTORY,
  MAX_STRATEGY_REVISION,
  createLeagueStore,
  normalizeCompletedMatch,
} from '../src/strategy/leagueStore.js';

const directory = await mkdtemp(join(tmpdir(), 'stick-rts-league-'));
const file = join(directory, 'league.json');
const store = await createLeagueStore(file);
const match = (winner = 'red', durationSeconds = 42) => ({
  winner,
  durationSeconds,
  strategyRevisions: { red: 0, blue: 0 },
  teams: {
    red: { gold: 125, goldSpent: 450, losses: 3, composition: { miner: 2, warrior: 5 } },
    blue: { gold: 40, goldSpent: 400, losses: 7, composition: { archer: 4, turret: 1 } },
  },
});
function recordFromSeparateProcess(index) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tools/league-store-worker.mjs', file, String(index)], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Separate league-store worker ${index} exited with ${signal || code}.`));
    });
  });
}
try {
  const initial = await store.snapshot();
  if (initial.aggregate.matches !== 0 || initial.profiles.red.status !== 'pending-provider' || initial.profiles.blue.revision !== 0) throw new Error(`Unexpected empty snapshot: ${JSON.stringify(initial)}`);
  for (let index = 0; index < MAX_MATCH_HISTORY + 2; index++) await store.record(match(index % 2 ? 'blue' : 'red', index));
  const snapshot = await store.snapshot();
  if (snapshot.aggregate.matches !== MAX_MATCH_HISTORY || snapshot.recent.length !== 10 || snapshot.aggregate.wins.red + snapshot.aggregate.wins.blue !== MAX_MATCH_HISTORY) throw new Error(`History was not bounded/aggregated: ${JSON.stringify(snapshot.aggregate)}`);
  if (snapshot.recent[0].durationSeconds !== MAX_MATCH_HISTORY + 1 || snapshot.recent.at(-1).durationSeconds !== MAX_MATCH_HISTORY - 8) throw new Error('Recent results are not newest-first.');
  const initialPacket = await store.reviewPacket();
  const reviewed = await store.applyReviewedProfiles({ basedOnRevisions: { red: 0, blue: 0 }, basedOnHistoryDigest: initialPacket.basedOnHistoryDigest, profiles: { red: { summary: 'Hold the mine with a balanced force before committing.' }, blue: { summary: 'Use ranged pressure after securing early miners.' } } });
  if (reviewed.red.revision !== 1 || reviewed.blue.revision !== 1 || reviewed.red.status !== 'reviewed' || reviewed.blue.status !== 'reviewed') throw new Error(`Trusted review did not advance independent profiles: ${JSON.stringify(reviewed)}`);
  const afterReview = await store.snapshot();
  if (afterReview.profiles.red.summary !== reviewed.red.summary || afterReview.profiles.blue.summary !== reviewed.blue.summary) throw new Error('Reviewed profiles were not persisted.');
  const packet = await store.reviewPacket();
  if (packet.aggregate.matches !== MAX_MATCH_HISTORY || packet.history.length !== MAX_MATCH_HISTORY
    || packet.history[0].durationSeconds !== MAX_MATCH_HISTORY + 1
    || packet.profiles.red.summary !== reviewed.red.summary) {
    throw new Error(`Trusted review packet was not bounded, newest-first, and profile-complete: ${JSON.stringify(packet)}`);
  }
  // Atomic rename alone does not protect concurrent read-modify-write calls.
  // Exercise the store's serialization boundary with simultaneous completions.
  await Promise.all(Array.from({ length: 12 }, (_, index) => store.record(match(index % 2 ? 'blue' : 'red', 1_000 + index))));
  const concurrent = await store.snapshot();
  if (concurrent.aggregate.matches !== MAX_MATCH_HISTORY || concurrent.recent[0]?.durationSeconds !== 1_011
    || concurrent.recent.slice(0, 10).some((entry, index) => entry.durationSeconds !== 1_011 - index)) {
    throw new Error(`Concurrent match recording lost or reordered history: ${JSON.stringify(concurrent.recent)}`);
  }
  // The trusted offline review CLI can run while the companion serves Watch
  // completions, so exercise distinct store instances rather than only the
  // in-process promise queue above. Every completion must survive their
  // cross-process-style file-lock serialization.
  const secondStore = await createLeagueStore(file);
  await Promise.all(Array.from({ length: 8 }, (_, index) => (index % 2 ? store : secondStore).record({
    ...match(index % 2 ? 'blue' : 'red', 3_000 + index), matchId: `watch-multistore-${index}`,
  })));
  const multiStore = await store.snapshot();
  const multiStoreIds = new Set(multiStore.recent.map((entry) => entry.matchId));
  if (multiStore.aggregate.matches !== MAX_MATCH_HISTORY
    || Array.from({ length: 8 }, (_, index) => `watch-multistore-${index}`).some((id) => !multiStoreIds.has(id))) {
    throw new Error(`Separate local store instances lost completion writes: ${JSON.stringify(multiStore.recent)}`);
  }
  // The companion and trusted review CLI are distinct Node processes, not
  // merely separate store instances. Exercise the sidecar lock through real
  // concurrent child processes to ensure each read-modify-write survives.
  await Promise.all(Array.from({ length: 8 }, (_, index) => recordFromSeparateProcess(index)));
  const multiProcess = await store.snapshot();
  const multiProcessIds = new Set(multiProcess.recent.map((entry) => entry.matchId));
  if (multiProcess.aggregate.matches !== MAX_MATCH_HISTORY
    || Array.from({ length: 8 }, (_, index) => `watch-multiprocess-${index}`).some((id) => !multiProcessIds.has(id))) {
    throw new Error(`Separate Node processes lost completion writes: ${JSON.stringify(multiProcess.recent)}`);
  }
  // Browser completion delivery can retry after losing a response. The same
  // opaque id must preserve one result rather than inflate wins/history.
  const beforeRetry = await store.snapshot();
  const retryMatch = { ...match('red', 2_000), matchId: 'watch-retry-safe-001' };
  await store.record(retryMatch);
  const afterFirstRetryDelivery = await store.snapshot();
  await store.record(retryMatch);
  const afterRetry = await store.snapshot();
  if (afterFirstRetryDelivery.aggregate.matches !== beforeRetry.aggregate.matches || afterRetry.recent[0]?.matchId !== retryMatch.matchId
    || JSON.stringify(afterRetry) !== JSON.stringify(afterFirstRetryDelivery)) {
    throw new Error(`Retried match completion was not idempotent: ${JSON.stringify({ beforeRetry, afterRetry })}`);
  }
  let rejectedMatchIdConflict = false;
  try { await store.record({ ...retryMatch, winner: 'blue' }); } catch { rejectedMatchIdConflict = true; }
  if (!rejectedMatchIdConflict || JSON.stringify(await store.snapshot()) !== JSON.stringify(afterRetry)) {
    throw new Error('A reused match id silently accepted a different completed result.');
  }
  let rejectedReview = false;
  try { await store.applyReviewedProfiles({ profiles: { red: { summary: 'Only red exists.' } } }); } catch { rejectedReview = true; }
  if (!rejectedReview) throw new Error('Incomplete trusted review was accepted.');
  let rejectedStaleReview = false;
  try {
    await store.applyReviewedProfiles({ basedOnRevisions: { red: 0, blue: 0 }, basedOnHistoryDigest: packet.basedOnHistoryDigest, profiles: { red: { summary: 'Stale red review.' }, blue: { summary: 'Stale blue review.' } } });
  } catch { rejectedStaleReview = true; }
  if (!rejectedStaleReview) throw new Error('A stale trusted review overwrote newer profiles.');
  const packetBeforeNewMatch = await store.reviewPacket();
  await store.record(match('blue', 2_001));
  let rejectedStaleHistoryReview = false;
  try {
    await store.applyReviewedProfiles({ basedOnRevisions: packetBeforeNewMatch.basedOnRevisions, basedOnHistoryDigest: packetBeforeNewMatch.basedOnHistoryDigest, profiles: { red: { summary: 'Review based on old history.' }, blue: { summary: 'Review based on old history.' } } });
  } catch { rejectedStaleHistoryReview = true; }
  if (!rejectedStaleHistoryReview) throw new Error('A review based on stale match history was accepted.');
  let rejected = false;
  try { normalizeCompletedMatch({ ...match(), winner: 'green' }); } catch { rejected = true; }
  if (!rejected) throw new Error('Invalid winner was accepted.');
  const oversizedCases = [
    { label: 'duration', value: { ...match(), durationSeconds: MAX_MATCH_DURATION_SECONDS + 1 } },
    { label: 'gold', value: { ...match(), teams: { ...match().teams, red: { ...match().teams.red, gold: MAX_MATCH_ECONOMY + 1 } } } },
    { label: 'losses', value: { ...match(), teams: { ...match().teams, blue: { ...match().teams.blue, losses: MAX_MATCH_COUNT + 1 } } } },
    { label: 'composition', value: { ...match(), teams: { ...match().teams, red: { ...match().teams.red, composition: { miner: MAX_MATCH_COUNT + 1 } } } } },
  ];
  for (const oversized of oversizedCases) {
    let rejectedOversized = false;
    try { normalizeCompletedMatch(oversized.value); } catch { rejectedOversized = true; }
    if (!rejectedOversized) throw new Error(`Oversized ${oversized.label} was accepted into bounded history.`);
  }
  let rejectedOversizedRevision = false;
  try {
    normalizeCompletedMatch({ ...match(), strategyRevisions: { red: MAX_STRATEGY_REVISION + 1, blue: 0 } });
  } catch { rejectedOversizedRevision = true; }
  if (!rejectedOversizedRevision) throw new Error('Oversized strategy revision was accepted into bounded history.');
  let rejectedMatchId = false;
  try { normalizeCompletedMatch({ ...match(), matchId: 'not allowed!' }); } catch { rejectedMatchId = true; }
  if (!rejectedMatchId) throw new Error('Malformed match id was accepted into bounded history.');
  const persisted = JSON.parse(await readFile(file, 'utf8'));
  if (persisted.matches.length !== MAX_MATCH_HISTORY) throw new Error('Bounded history was not persisted.');
  // Persisted data is an API boundary too: hand-edited/corrupt records must
  // not reach history readers or be used as future strategy state. Repeating
  // an existing id must not inflate results if an older/interrupted file is
  // manually restored with both an original completion and its retry.
  const originalRetry = persisted.matches.find((entry) => entry.matchId === retryMatch.matchId);
  if (!originalRetry) throw new Error('Idempotency fixture was unexpectedly evicted from bounded history.');
  persisted.matches.push({ ...originalRetry, winner: 'blue', durationSeconds: 9_998 });
  persisted.matches.push({ schemaVersion: 1, recordedAt: 'not-a-date', ...match('red', 9_999) });
  persisted.profiles.red = { team: 'blue', revision: 'bad', status: 'reviewed', summary: 'Injected profile' };
  persisted.profiles.blue = { team: 'red', revision: MAX_STRATEGY_REVISION + 1, status: 'reviewed', summary: '  Defend, then counterattack.  ', updatedAt: '2026-07-28T00:00:00.000Z' };
  await writeFile(file, JSON.stringify(persisted), 'utf8');
  const sanitized = await store.snapshot();
  if (sanitized.aggregate.matches !== MAX_MATCH_HISTORY || sanitized.profiles.red.status !== 'pending-provider'
    || sanitized.profiles.blue.status !== 'pending-provider'
    || sanitized.recent.some((entry) => entry.durationSeconds === 9_999 || entry.durationSeconds === 9_998)
    || sanitized.recent.filter((entry) => entry.matchId === retryMatch.matchId).length !== 1) {
    throw new Error(`Persisted league sanitization failed: ${JSON.stringify(sanitized)}`);
  }
  const sanitizedPacket = await store.reviewPacket();
  if (sanitizedPacket.history.some((entry) => entry.durationSeconds === 9_999)
    || sanitizedPacket.profiles.red.status !== 'pending-provider') {
    throw new Error(`Trusted review packet exposed corrupt persisted data: ${JSON.stringify(sanitizedPacket)}`);
  }
  // The pending status is an explicit absent-provider sentinel, never an
  // alternate storage route for unreviewed strategy text. Reviewed profiles
  // require the revision/timestamp produced by the trusted application path.
  persisted.profiles.red = { team: 'red', revision: 0, status: 'pending-provider', summary: 'Inject unreviewed strategy.', updatedAt: null };
  persisted.profiles.blue = { team: 'blue', revision: 1, status: 'reviewed', summary: 'Missing trusted timestamp.' };
  await writeFile(file, JSON.stringify(persisted), 'utf8');
  const invariantSanitized = await store.snapshot();
  if (invariantSanitized.profiles.red.status !== 'pending-provider' || invariantSanitized.profiles.red.summary !== 'No external strategy review has been applied.'
    || invariantSanitized.profiles.blue.status !== 'pending-provider') {
    throw new Error(`Profile review-state invariants did not reset corrupt storage: ${JSON.stringify(invariantSanitized.profiles)}`);
  }
  // An interrupted/manual write can leave invalid JSON rather than a malformed
  // object. It must resolve to the same no-history/no-profile boundary instead
  // of surfacing stale state or making the companion history screen unusable.
  await writeFile(file, '{not valid json', 'utf8');
  const invalidJsonSnapshot = await store.snapshot();
  if (invalidJsonSnapshot.aggregate.matches !== 0 || invalidJsonSnapshot.profiles.red.status !== 'pending-provider'
    || invalidJsonSnapshot.profiles.blue.status !== 'pending-provider') {
    throw new Error(`Invalid JSON did not fail closed to an empty league: ${JSON.stringify(invalidJsonSnapshot)}`);
  }
  await store.record(match('blue', 77));
  const recoveredAfterInvalidJson = await store.snapshot();
  if (recoveredAfterInvalidJson.aggregate.matches !== 1 || recoveredAfterInvalidJson.recent[0]?.durationSeconds !== 77) {
    throw new Error(`A valid completion did not safely recover invalid JSON storage: ${JSON.stringify(recoveredAfterInvalidJson)}`);
  }
  // A crashed companion/review CLI can leave its exclusive sidecar behind.
  // An old lock must be reclaimed so the next valid Watch completion restores
  // persistence rather than remaining permanently unavailable.
  const staleLock = `${file}.lock`;
  await writeFile(staleLock, 'interrupted local writer', 'utf8');
  const staleAt = new Date(Date.now() - 61_000);
  await utimes(staleLock, staleAt, staleAt);
  await store.record(match('red', 78));
  const recoveredAfterStaleLock = await store.snapshot();
  if (recoveredAfterStaleLock.aggregate.matches !== 2 || recoveredAfterStaleLock.recent[0]?.durationSeconds !== 78) {
    throw new Error(`A stale local write lock blocked recovery: ${JSON.stringify(recoveredAfterStaleLock)}`);
  }
  console.log('PASS — bounded schema-versioned Red/Blue history and pending review profiles persist safely.');
} finally { await rm(directory, { recursive: true, force: true }); }
