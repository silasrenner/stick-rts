import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const output = 'training/artifacts/imitation-smoke.json';
rmSync(output, { force: true });
const run = spawnSync('python', ['training/train_imitation.py', '--dataset', 'training/artifacts/scripted-hard-demonstrations-v001.jsonl', '--epochs', '12', '--seed', '16000', '--output', output], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
if (run.status !== 0 || !existsSync(output)) throw new Error(`Imitation training failed: ${run.stderr || run.stdout}`);
const checkpoint = JSON.parse(readFileSync(output, 'utf8'));
rmSync(output, { force: true });
if (checkpoint.format !== 'stick-rts-imitation-policy-v1' || checkpoint.algorithm !== 'masked-mlp-behavior-cloning-v1'
  || checkpoint.metrics.finalAccuracy <= 0.25 || checkpoint.weights.w1.length !== 12) {
  throw new Error(`Imitation checkpoint is not usable: ${JSON.stringify(checkpoint.metrics)}`);
}
console.log('PASS — scripted demonstrations train a versioned legal-action imitation policy.');
