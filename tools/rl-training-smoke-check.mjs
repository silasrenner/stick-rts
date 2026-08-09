import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const output = 'training/artifacts/self-play-smoke.json';
rmSync(output, { force: true });
const run = spawnSync('python', ['training/train_self_play.py', '--episodes', '2', '--seed', '9300', '--output', output], {
  cwd: process.cwd(), encoding: 'utf8', timeout: 180000,
});
if (run.status !== 0) throw new Error(`Self-play smoke training failed: ${run.stderr || run.stdout}`);
if (!existsSync(output)) throw new Error('Self-play trainer did not save a checkpoint manifest.');
const checkpoint = JSON.parse(readFileSync(output, 'utf8'));
if (checkpoint.format !== 'stick-rts-direct-policy-v1' || checkpoint.episodes !== 2
  || !Array.isArray(checkpoint.weights) || checkpoint.weights.length === 0
  || checkpoint.environment.actionCount !== 42 || checkpoint.opponentPolicy !== 'opening-pressure-v1' || checkpoint.metrics.length !== 2) {
  throw new Error(`Self-play checkpoint is malformed: ${JSON.stringify(checkpoint)}`);
}
rmSync(output, { force: true });
console.log('PASS — direct-policy self-play smoke run saves a versioned, reproducible checkpoint manifest.');
