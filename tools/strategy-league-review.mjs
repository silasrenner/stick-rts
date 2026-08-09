// Trusted, offline review-application boundary for the OpenAI/Codex workflow.
// It makes no provider request and is never served to browsers. Invoke it only
// with a separately reviewed JSON file shaped as:
// {"basedOnRevisions":{"red":0,"blue":0},"basedOnHistoryDigest":"<packet digest>","profiles":{"red":{"summary":"..."},"blue":{"summary":"..."}}}
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createLeagueStore } from '../src/strategy/leagueStore.js';

const args = process.argv.slice(2);
const indexOfInput = args.indexOf('--input');
const indexOfData = args.indexOf('--data');
const inputPath = indexOfInput >= 0 ? args[indexOfInput + 1] : null;
const dataOverride = indexOfData >= 0 ? args[indexOfData + 1] : null;
const validArgs = args.length === 2 || (args.length === 4 && indexOfData >= 0);
if (!inputPath || !validArgs) throw new Error('Usage: node tools/strategy-league-review.mjs --input reviewed-profiles.json [--data league.json]');

const dataPath = resolve(dataOverride || process.env.LEAGUE_DATA_FILE || join(process.cwd(), '.local', 'strategy-league.json'));
const review = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const store = await createLeagueStore(dataPath);
const profiles = await store.applyReviewedProfiles(review);
console.log(`Applied reviewed Red/Blue strategy profiles: red r${profiles.red.revision}, blue r${profiles.blue.revision}.`);
