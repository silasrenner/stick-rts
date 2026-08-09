import { spawnSync } from 'node:child_process';

const run = spawnSync('python', ['training/evaluate_checkpoint.py', '--checkpoint', 'training/artifacts/imitation-v001.json', '--episodes', '3', '--seed', '18000'], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
if (run.status !== 0) throw new Error(`Imitation evaluation failed: ${run.stderr || run.stdout}`);
const report = JSON.parse(run.stdout);
if (report.checkpoint.format !== 'stick-rts-imitation-policy-v1' || report.episodes.length !== 3) {
  throw new Error(`Imitation policy evaluation report is malformed: ${run.stdout}`);
}
console.log('PASS — behavior-cloned policy runs through the real held-out simulator.');
