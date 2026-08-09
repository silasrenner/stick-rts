import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['tools/rl-env-server.mjs'], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
child.stdin.write(`${JSON.stringify({ id: 1, op: 'reset-self-play', seed: 8800 })}\n`);
child.stdin.write(`${JSON.stringify({ id: 2, op: 'step-self-play', actions: { player: 7, ai: 7 } })}\n`);
child.stdin.write(`${JSON.stringify({ id: 3, op: 'close' })}\n`);
child.stdin.end();
const exitCode = await new Promise((resolve) => child.on('close', resolve));
if (exitCode !== 0 || stderr) throw new Error(`Self-play protocol server failed: ${stderr}`);
const [reset, step] = stdout.trim().split('\n').map((line) => JSON.parse(line));
if (!Array.isArray(reset.result.observation.player) || !Array.isArray(reset.result.observation.ai)
  || !step.result.actionResult.player.ok || !step.result.actionResult.ai.ok
  || typeof step.result.reward.player !== 'number' || typeof step.result.reward.ai !== 'number') {
  throw new Error(`Self-play protocol responses are malformed: ${stdout}`);
}
console.log('PASS — RL JSON-lines server bridges simultaneous self-play actions.');
