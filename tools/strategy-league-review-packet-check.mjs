import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createLeagueStore } from '../src/strategy/leagueStore.js';

const execFile = promisify(execFileCallback);
const directory = await mkdtemp(join(tmpdir(), 'stick-rts-review-packet-'));
const dataFile = join(directory, 'league.json');
const match = {
  winner: 'blue', durationSeconds: 61, strategyRevisions: { red: 0, blue: 0 },
  teams: {
    red: { gold: 10, goldSpent: 500, losses: 8, composition: { miner: 2, warrior: 3 } },
    blue: { gold: 80, goldSpent: 450, losses: 2, composition: { archer: 4, turret: 1 } },
  },
};
try {
  const store = await createLeagueStore(dataFile);
  await store.record(match);
  const firstPacket = await store.reviewPacket();
  await store.applyReviewedProfiles({ basedOnRevisions: { red: 0, blue: 0 }, basedOnHistoryDigest: firstPacket.basedOnHistoryDigest, profiles: { red: { summary: 'Protect miners before advancing.' }, blue: { summary: 'Build ranged pressure after mining.' } } });
  const { stdout } = await execFile(process.execPath, ['tools/strategy-league-review-packet.mjs', '--data', dataFile], { cwd: process.cwd() });
  const packet = JSON.parse(stdout);
  if (packet.aggregate?.matches !== 1 || packet.aggregate?.wins?.blue !== 1 || packet.history?.length !== 1
    || packet.history[0]?.durationSeconds !== 61 || packet.profiles?.red?.summary !== 'Protect miners before advancing.'
    || packet.profiles?.blue?.revision !== 1 || packet.basedOnRevisions?.red !== 1 || packet.basedOnRevisions?.blue !== 1
    || !/^[a-f0-9]{64}$/.test(packet.basedOnHistoryDigest || '')) {
    throw new Error(`Review packet CLI output is incomplete: ${stdout}`);
  }
  const reviewFile = join(directory, 'reviewed-profiles.json');
  await writeFile(reviewFile, JSON.stringify({
    basedOnRevisions: packet.basedOnRevisions,
    basedOnHistoryDigest: packet.basedOnHistoryDigest,
    profiles: { red: { summary: 'Hold the mine, then counterattack.' }, blue: { summary: 'Use archers after a safe mining start.' } },
  }), 'utf8');
  await execFile(process.execPath, ['tools/strategy-league-review.mjs', '--input', reviewFile, '--data', dataFile], { cwd: process.cwd() });
  const advanced = await store.snapshot();
  if (advanced.profiles.red.revision !== 2 || advanced.profiles.blue.revision !== 2) {
    throw new Error(`Review CLI did not apply packet-bound profile revisions: ${JSON.stringify(advanced.profiles)}`);
  }
  console.log('PASS — trusted review packet CLI emits bounded compact history and independent current profiles without a provider request.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
