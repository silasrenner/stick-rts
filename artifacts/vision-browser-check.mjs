import { mkdir, writeFile } from 'node:fs/promises';

const appUrl = 'http://127.0.0.1:8813/?vision-check=' + Date.now();
const outDir = new URL('./vision-browser/', import.meta.url);
await mkdir(outDir, { recursive: true });

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:9223/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target creation failed: ${response.status}`);
  return response.json();
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')); };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); });
  return { ws, ready, send, errors };
}
const target = await newTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl); await ready;
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: appUrl }); await new Promise((resolve) => setTimeout(resolve, 500));
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }

const viewResult = await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 77);
  window.__world.units = [
    { ...window.__world.units[0], id: 7001, team: 'player', kind: 'warrior', x: 1000, y: 440, state: 'idle', hp: 78, maxHp: 78, isHero: false },
    { ...window.__world.units[0], id: 7002, team: 'ai', kind: 'warrior', x: 1600, y: 440, state: 'idle', hp: 78, maxHp: 78, isHero: false }
  ];
  window.__world.structures = [{ ...window.__world.structures[0], id: 7003, team: 'ai', x: 1700, y: 440, state: 'idle', hp: 150, maxHp: 150, isTurret: true }];
  window.__uiState.spectatorView = 'full'; window.__forceTicks(0);
  const before = window.__uiState.spectatorView;
  const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 238 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  const afterLeftClick = window.__uiState.spectatorView;
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 294 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  const afterRightClick = window.__uiState.spectatorView;
  ({ before, afterLeftClick, afterRightClick });
`);
if (viewResult.before !== 'full' || viewResult.afterLeftClick !== 'left' || viewResult.afterRightClick !== 'right') throw new Error(`Spectator control selection failed: ${JSON.stringify(viewResult)}`);

for (const view of ['full', 'left', 'right']) {
  await evaluate(`window.__uiState.spectatorView = '${view}'; window.__forceTicks(0);`);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(new URL(`${view}.png`, outDir), Buffer.from(data, 'base64'));
}
const deterministic = await evaluate(`
  const snapshot = () => JSON.stringify({ state: window.__world.matchState, time: window.__world.matchElapsedTime, teams: Object.fromEntries(Object.entries(window.__world.teams).map(([team, value]) => [team, { gold: value.gold, command: value.command, queue: value.productionQueue, buildIndex: value.buildIndex, strategicGoal: value.strategicGoal }])), units: window.__world.units.map(({ team, kind, x, y, hp, state }) => ({ team, kind, x, y, hp, state })), structures: window.__world.structures.map(({ team, x, hp, state }) => ({ team, x, hp, state })) });
  window.__startWatchAiMatch('hard', 'hard', 505); window.__uiState.spectatorView = 'full'; window.__forceTicks(300); const full = snapshot();
  window.__startWatchAiMatch('hard', 'hard', 505); window.__uiState.spectatorView = 'left'; window.__forceTicks(300); const left = snapshot();
  window.__startWatchAiMatch('hard', 'hard', 505); window.__uiState.spectatorView = 'right'; window.__forceTicks(300); const right = snapshot();
  ({ fullEqualsLeft: full === left, fullEqualsRight: full === right, bytes: full.length });
`);
if (!deterministic.fullEqualsLeft || !deterministic.fullEqualsRight) throw new Error(`Presentation view changed simulation: ${JSON.stringify(deterministic)}`);
if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
ws.close();
console.log(JSON.stringify({ viewResult, deterministic, screenshots: ['artifacts/vision-browser/full.png', 'artifacts/vision-browser/left.png', 'artifacts/vision-browser/right.png'] }, null, 2));
