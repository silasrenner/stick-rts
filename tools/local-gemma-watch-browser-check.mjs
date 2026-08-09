// Live Local Gemma Watch smoke check. Requires MODEL_COMMANDER=1 companion and Chrome CDP.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:8811/';
const cdpPort = Number(process.env.CDP_PORT || 9231);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = mkdtempSync(join(tmpdir(), 'stick-rts-local-gemma-check-'));
let browser;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await wait(100);
  }
  throw new Error(`${label} did not become ready.`);
}
async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target failed: ${response.status}`);
  return response.json();
}
function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      return;
    }
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { ws, ready, send, errors };
}

try {
  browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${userDataDir}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`, 'Chrome CDP');
  const target = await openTarget('about:blank');
  const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
  await ready;
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${appUrl}?local-gemma-watch-check=${Date.now()}` });
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await evaluate('typeof window.__startModelCommanderWatch') === 'function') break;
    if (attempt === 39) throw new Error('Game did not initialize with the Local Gemma Watch test hook.');
    await wait(100);
  }
  await evaluate('window.__startModelCommanderWatch()');
  let initial;
  // The local provider has a 30s cold-start-safe bound and current requests
  // are still serial in this pre-orchestration slice, so permit both teams to
  // finish a cold initial turn before declaring the browser bridge failed.
  for (let attempt = 0; attempt < 700; attempt += 1) {
    await wait(100);
    initial = await evaluate(`(() => {
      const w = window.__world;
      return { pending: w.modelCommander?.pending, player: w.teams.player.commanderEvent, ai: w.teams.ai.commanderEvent, playerPriority: w.teams.player.commanderPriority, aiPriority: w.teams.ai.commanderPriority };
    })()`);
    if (initial.player && initial.ai) break;
    if (attempt === 699) throw new Error(`Local Gemma decisions did not reach both teams: ${JSON.stringify(initial)}`);
  }
  await evaluate('window.__uiState.watchSpeed = 20');
  await wait(6_000);
  await evaluate('window.__forceTicks(720)');
  const trace = await evaluate(`(() => {
    const w = window.__world;
    const team = (name) => ({
      gold: w.teams[name].gold,
      command: w.teams[name].command,
      event: w.teams[name].commanderEvent,
      priorities: w.teams[name].commanderPriority,
      queue: w.teams[name].productionQueue.map((item) => item.kind ?? item.action),
      units: w.units.filter((unit) => unit.team === name && unit.state !== 'dying').map((unit) => unit.kind),
    });
    return { elapsed: w.matchElapsedTime, player: team('player'), ai: team('ai') };
  })()`);
  ws.close();
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  for (const [name, team] of Object.entries({ player: trace.player, ai: trace.ai })) {
    if (!team.event || (team.units.length + team.queue.length) < 2) throw new Error(`Local Gemma ${name} did not issue/advance a production plan: ${JSON.stringify(trace)}`);
    if (team.command !== 'attack') throw new Error(`Local Gemma ${name} remained in passive defense instead of pursuing the core objective: ${JSON.stringify(trace)}`);
  }
  console.log(JSON.stringify(trace, null, 2));
} finally {
  if (browser && !browser.killed) browser.kill();
  rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
