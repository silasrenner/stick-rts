import { spawnSync } from 'node:child_process';

const run = spawnSync('python', ['training/policy.py', '--smoke'], { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 });
if (run.status !== 0) throw new Error(`PPO policy smoke run failed: ${run.stderr || run.stdout}`);
const report = JSON.parse(run.stdout);
if (report.algorithm !== 'masked-mlp-ppo-v1' || report.action !== 1 || report.probability <= 0 || !Number.isFinite(report.value)
  || report.clippedObjective !== 1.2) {
  throw new Error(`PPO policy smoke report is invalid: ${run.stdout}`);
}
console.log('PASS — masked MLP policy samples legal actions and applies the PPO clip objective.');
