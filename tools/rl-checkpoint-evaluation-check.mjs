import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checkpoint = 'training/artifacts/eval-smoke-source.json';
rmSync(checkpoint, { force: true });
const train = spawnSync('python', ['training/train_self_play.py', '--episodes', '2', '--seed', '9700', '--output', checkpoint], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
if (train.status !== 0 || !existsSync(checkpoint)) throw new Error(`Could not create evaluation source checkpoint: ${train.stderr || train.stdout}`);
const evaluate = spawnSync('python', ['training/evaluate_checkpoint.py', '--checkpoint', checkpoint, '--episodes', '2', '--seed', '9800'], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
rmSync(checkpoint, { force: true });
if (evaluate.status !== 0) throw new Error(`Checkpoint evaluation failed: ${evaluate.stderr || evaluate.stdout}`);
const report = JSON.parse(evaluate.stdout);
if (report.checkpoint.format !== 'stick-rts-direct-policy-v1' || report.episodes.length !== 2
  || !report.episodes.every((episode) => typeof episode.terminalReason === 'string' && Number.isFinite(episode.playerReward))) {
  throw new Error(`Checkpoint evaluation report is malformed: ${evaluate.stdout}`);
}
console.log('PASS — trained checkpoint is evaluated greedily on fresh held-out seeds.');
