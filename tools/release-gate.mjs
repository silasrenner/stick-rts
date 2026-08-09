// Reproducible desktop + mobile release gate. Run: node tools/release-gate.mjs
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const repo = process.cwd();
const port = Number(process.env.RELEASE_GATE_PORT || 8044);
const cdpPort = Number(process.env.RELEASE_GATE_CDP_PORT || 9224);
const baseUrl = `http://127.0.0.1:${port}`;
const chrome = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');
const startedAt = new Date();
const evidenceDir = join(repo, 'artifacts', 'release-gates');
const leagueDataDir = mkdtempSync(join(tmpdir(), 'stick-rts-release-league-'));
const leagueDataFile = join(leagueDataDir, 'league.json');
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
  // Use the actual same-origin companion rather than a static-only server so
  // the browser gate exercises the Strategy League menu/API integration too.
  // This temporary bounded fixture is removed after the gate and never touches
  // a user's persistent local league history.
  writeFileSync(leagueDataFile, `${JSON.stringify({
    schemaVersion: 1,
    matches: [
      { schemaVersion: 1, recordedAt: '2026-07-28T00:00:00.000Z', matchId: 'release-league-red-001', winner: 'red', durationSeconds: 41, strategyRevisions: { red: 1, blue: 0 }, teams: { red: { gold: 90, goldSpent: 400, losses: 2, composition: { warrior: 4 } }, blue: { gold: 10, goldSpent: 450, losses: 6, composition: { archer: 3 } } } },
      { schemaVersion: 1, recordedAt: '2026-07-28T00:01:00.000Z', matchId: 'release-league-blue-001', winner: 'blue', durationSeconds: 63, strategyRevisions: { red: 1, blue: 0 }, teams: { red: { gold: 15, goldSpent: 500, losses: 8, composition: { miner: 1 } }, blue: { gold: 120, goldSpent: 420, losses: 3, composition: { warrior: 5 } } } },
    ],
    profiles: {
      red: { team: 'red', revision: 1, status: 'reviewed', summary: 'Secure mines before committing the main force.', updatedAt: '2026-07-28T00:00:00.000Z' },
      blue: { team: 'blue', revision: 0, status: 'pending-provider', summary: 'No external strategy review has been applied.', updatedAt: null },
    },
  }, null, 2)}\n`);
  server = spawn('node', ['tools/lan-preview-server.mjs'], { cwd: repo, stdio: 'ignore', env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', LEAGUE_DATA_FILE: leagueDataFile } });
  await waitFor(`${baseUrl}/`, 'Static server');
  browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${join(repo, '.release-gate-chrome')}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`, 'Chrome CDP');

  run('diff whitespace', 'git', ['diff', '--check']);
  for (const file of execFileSync('git', ['ls-files', '*.js'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)) run(`syntax ${file}`, 'node', ['--check', file]);
  run('simulation invariants', 'node', ['tools/headless.js']);
  const browserEnv = { CDP_PORT: String(cdpPort), APP_URL: baseUrl };
  run('Strategy League browser history', 'node', ['tools/league-history-browser-check.mjs'], browserEnv);
  run('desktop UX', 'node', ['tools/desktop-ux-check.mjs'], browserEnv);
  run('mobile pan', 'node', ['tools/mobile-pan-check.mjs'], browserEnv);
  run('mobile orientation and pinch UX', 'node', ['tools/mobile-ux-check.mjs'], browserEnv);
} catch (error) {
  artifact.error = error.message;
} finally {
  stop(browser);
  stop(server);
  rmSync(leagueDataDir, { recursive: true, force: true });
  artifact.finishedAt = new Date().toISOString();
  artifact.passed = !artifact.error;
  mkdirSync(evidenceDir, { recursive: true });
  const stamp = artifact.startedAt.replace(/[:.]/g, '-');
  writeFileSync(join(evidenceDir, `${stamp}-${artifact.commit.slice(0, 7)}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
}
console.log(JSON.stringify(artifact, null, 2));
if (!artifact.passed) process.exitCode = 1;
