import { mkdir, writeFile } from 'node:fs/promises';

const appUrl = `http://127.0.0.1:8814/?ai-perception-validation=${Date.now()}`;
const outDir = new URL('./ai-perception-browser/', import.meta.url);
await mkdir(outDir, { recursive: true });

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
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
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    throw new Error(`${detail.text}: ${detail.exception?.description ?? detail.exception?.value ?? 'no browser exception detail'}`);
  }
  return result.result.value;
}

const controlResult = await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 701);
  window.__uiState.spectatorView = 'full'; window.__forceTicks(0);
  const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 238 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  const left = window.__uiState.spectatorView;
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 294 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  ({ left, right: window.__uiState.spectatorView });
`);
if (controlResult.left !== 'left' || controlResult.right !== 'right') throw new Error(`Spectator controls failed: ${JSON.stringify(controlResult)}`);

const results = {};
for (const view of ['full', 'left', 'right']) {
  results[view] = await evaluate(`
    (() => {
    window.__startWatchAiMatch('hard', 'hard', 701);
    window.__uiState.spectatorView = '${view}';
    window.__forceTicks(18000);
    const normalizeMemory = (memory = {}) => ({
      composition: memory.composition ?? {},
      visible: (memory.currentlyVisibleEnemies ?? []).map(({ kind, x, y, hp, state, lastSeenAt }) => ({ kind, x, y, hp, state, lastSeenAt })),
      remembered: (memory.rememberedEnemyUnits ?? []).map(({ kind, x, y, hp, state, lastSeenAt }) => ({ kind, x, y, hp, state, lastSeenAt })),
    });
    return JSON.stringify({
      time: window.__world.matchElapsedTime,
      matchState: window.__world.matchState,
      teams: Object.fromEntries(Object.entries(window.__world.teams).map(([team, state]) => [team, {
        gold: state.gold, command: state.command, strategicGoal: state.strategicGoal, buildIndex: state.buildIndex,
        queue: state.productionQueue.map(({ action, kind }) => ({ action, kind })),
        decision: state.lastAiDecision ? { goal: state.lastAiDecision.goal, selection: state.lastAiDecision.selection, memory: normalizeMemory(window.__world.aiMemory[team]) } : null,
      }])),
      units: window.__world.units.map(({ team, kind, x, y, hp, state }) => ({ team, kind, x, y, hp, state })),
      structures: window.__world.structures.map(({ team, x, y, hp, state }) => ({ team, x, y, hp, state })),
    });
    })()
  `);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(new URL(`${view}-seed-701-t300.png`, outDir), Buffer.from(data, 'base64'));
}
if (results.full !== results.left || results.full !== results.right) throw new Error('Spectator view changed fixed-seed AI perception or match output.');
if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
ws.close();
console.log(JSON.stringify({ controlResult, deterministic: { fullEqualsLeft: results.full === results.left, fullEqualsRight: results.full === results.right, snapshotBytes: results.full.length }, screenshots: ['artifacts/ai-perception-browser/full-seed-701-t300.png', 'artifacts/ai-perception-browser/left-seed-701-t300.png', 'artifacts/ai-perception-browser/right-seed-701-t300.png'] }, null, 2));
