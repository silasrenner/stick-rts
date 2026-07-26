// Reproducible desktop + mobile release gate. Run: node tools/release-gate.mjs
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.cwd();
const port = Number(process.env.RELEASE_GATE_PORT || 8044);
const cdpPort = Number(process.env.RELEASE_GATE_CDP_PORT || 9224);
const baseUrl = `http://127.0.0.1:${port}`;
const chrome = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');
const startedAt = new Date();
const evidenceDir = join(repo, 'artifacts', 'release-gates');
const artifact = {
  schema: 1,
  startedAt: startedAt.toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim(),
  checks: [],
};

function run(label, command, args, env = {}) {
  const began = Date.now();
  try {
    const output = execFileSync(command, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
    artifact.checks.push({ label, passed: true, elapsedMs: Date.now() - began, output: output.trim() });
  } catch (error) {
    artifact.checks.push({ label, passed: false, elapsedMs: Date.now() - began, output: `${error.stdout || ''}${error.stderr || error.message}`.trim() });
    throw new Error(`${label} failed`);
  }
}
async function waitFor(url, description) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${description} did not become ready`);
}
function stop(process) { if (process && !process.killed) process.kill(); }

let server;
let browser;
try {
  if (!existsSync(chrome)) throw new Error(`Chrome not found: ${chrome}. Set CHROME_PATH to override.`);
  server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: repo, stdio: 'ignore' });
  await waitFor(`${baseUrl}/`, 'Static server');
  browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${join(repo, '.release-gate-chrome')}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`, 'Chrome CDP');

  run('diff whitespace', 'git', ['diff', '--check']);
  for (const file of execFileSync('git', ['ls-files', '*.js'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)) run(`syntax ${file}`, 'node', ['--check', file]);
  run('simulation invariants', 'node', ['tools/headless.js']);
  const browserEnv = { CDP_PORT: String(cdpPort), APP_URL: baseUrl };
  run('desktop UX', 'node', ['tools/desktop-ux-check.mjs'], browserEnv);
  run('mobile pan', 'node', ['tools/mobile-pan-check.mjs'], browserEnv);
  run('mobile orientation and pinch UX', 'node', ['tools/mobile-ux-check.mjs'], browserEnv);
} catch (error) {
  artifact.error = error.message;
} finally {
  stop(browser);
  stop(server);
  artifact.finishedAt = new Date().toISOString();
  artifact.passed = !artifact.error;
  mkdirSync(evidenceDir, { recursive: true });
  const stamp = artifact.startedAt.replace(/[:.]/g, '-');
  writeFileSync(join(evidenceDir, `${stamp}-${artifact.commit.slice(0, 7)}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify(artifact, null, 2));
if (!artifact.passed) process.exitCode = 1;
