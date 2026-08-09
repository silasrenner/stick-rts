// Trusted, offline input builder for the external OpenAI/Codex review workflow.
// It is not served by the companion and never calls a provider. Pipe its JSON
// to a reviewer, then pass only the completed reviewed profiles to
// strategy-league-review.mjs. Copy `basedOnRevisions` and
// `basedOnHistoryDigest` unchanged into the reviewed input; together they
// prevent a stale external review from replacing newer profiles or ignoring
// matches recorded while review was in progress.
import { join, resolve } from 'node:path';
import { createLeagueStore } from '../src/strategy/leagueStore.js';

const args = process.argv.slice(2);
const indexOfData = args.indexOf('--data');
if (args.length !== 0 && (args.length !== 2 || indexOfData !== 0 || !args[1])) {
  throw new Error('Usage: node tools/strategy-league-review-packet.mjs [--data league.json]');
}

const dataPath = resolve(args[1] || process.env.LEAGUE_DATA_FILE || join(process.cwd(), '.local', 'strategy-league.json'));
const store = await createLeagueStore(dataPath);
process.stdout.write(`${JSON.stringify(await store.reviewPacket(), null, 2)}\n`);
