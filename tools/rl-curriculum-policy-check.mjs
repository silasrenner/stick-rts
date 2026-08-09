import { spawnSync } from 'node:child_process';

const result = spawnSync('python', ['training/curriculum_policy.py', '--smoke'], { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 });
if (result.status !== 0) throw new Error(`Curriculum policy smoke check failed: ${result.stderr || result.stdout}`);
const probe = JSON.parse(result.stdout);
if (probe.name !== 'opening-pressure-v1' || probe.firstAction !== 25 || !probe.actions.every((action) => Number.isInteger(action) && action >= 0 && action < 42)) {
  throw new Error(`Curriculum policy produced an invalid RL action contract: ${result.stdout}`);
}
console.log('PASS — explicit training-only curriculum policy emits only bounded RL actions.');
