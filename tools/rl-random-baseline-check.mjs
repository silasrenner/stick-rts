import { spawnSync } from 'node:child_process';

const result = spawnSync('python', ['training/random_policy_eval.py', '--episodes', '2', '--seed', '8100'], { cwd: process.cwd(), encoding: 'utf8', timeout: 120000 });
if (result.status !== 0) throw new Error(`Random-policy baseline failed: ${result.stderr || result.stdout}`);
const report = JSON.parse(result.stdout);
if (report.episodes.length !== 2 || !report.episodes.every((episode) => Number.isFinite(episode.reward) && typeof episode.terminalReason === 'string')) {
  throw new Error(`Random-policy baseline did not emit two measurable episodes: ${result.stdout}`);
}
console.log('PASS — Python baseline drives the Node environment through legal masked actions.');
