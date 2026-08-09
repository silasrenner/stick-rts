import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const output = 'training/artifacts/scripted-demo-smoke.jsonl';
rmSync(output, { force: true });
const run = spawnSync(process.execPath, ['tools/generate-scripted-demos.mjs', '--seeds', '2', '--output', output], { cwd: process.cwd(), encoding: 'utf8', timeout: 180000 });
if (run.status !== 0 || !existsSync(output)) throw new Error(`Scripted demonstration generation failed: ${run.stderr || run.stdout}`);
const entries = readFileSync(output, 'utf8').trim().split('\n').map(JSON.parse);
rmSync(output, { force: true });
if (entries.length < 4 || !entries.every((entry) => entry.schema === 'stick-rts-demo-v1' && entry.observation.length === 12 && Number.isInteger(entry.action) && entry.action >= 0 && entry.action < 42)) {
  throw new Error(`Scripted demonstration data is not a legal RL dataset: ${JSON.stringify(entries.slice(0, 2))}`);
}
console.log('PASS — scripted Watch decisions are recorded as legal 42-action imitation demonstrations.');
