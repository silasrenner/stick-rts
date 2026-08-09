import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['tools/rl-env-server.mjs'], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
child.stdin.write(`${JSON.stringify({ id: 1, op: 'reset', seed: 7001 })}\n`);
child.stdin.write(`${JSON.stringify({ id: 2, op: 'step', action: 7 })}\n`);
child.stdin.write(`${JSON.stringify({ id: 3, op: 'close' })}\n`);
child.stdin.end();
const exitCode = await new Promise((resolve) => child.on('close', resolve));
if (exitCode !== 0 || stderr) throw new Error(`RL protocol server failed: ${stderr}`);
const responses = stdout.trim().split('\n').map((line) => JSON.parse(line));
if (responses.length !== 3 || responses[0].id !== 1 || !Array.isArray(responses[0].result.observation)
  || responses[1].id !== 2 || typeof responses[1].result.reward !== 'number'
  || responses[2].id !== 3 || responses[2].result.closed !== true) {
  throw new Error(`RL protocol responses are malformed: ${stdout}`);
}
console.log('PASS — RL JSON-lines server accepts reset/step/close with clean machine-readable output.');
