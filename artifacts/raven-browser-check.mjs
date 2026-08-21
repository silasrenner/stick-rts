import { mkdir, writeFile } from 'node:fs/promises';

const appUrl = `http://127.0.0.1:8811/?raven-validation=${Date.now()}`;
const outDir = new URL('./raven-browser/', import.meta.url);
await mkdir(outDir, { recursive: true });

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:9225/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target creation failed: ${response.status}`);
  return response.json();
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id); pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    }
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { ws, ready, send, errors };
}

const target = await newTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: appUrl });
await new Promise((resolve) => setTimeout(resolve, 500));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text}: ${result.exceptionDetails.exception?.description ?? 'browser exception'}`);
  return result.result.value;
}
async function screenshot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(new URL(`${name}.png`, outDir), Buffer.from(data, 'base64'));
}

const controlResult = await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 8801);
  const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect();
  window.__uiState.spectatorView = 'full'; window.__forceTicks(0);
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 238 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  const left = window.__uiState.spectatorView;
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 294 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  ({ left, right: window.__uiState.spectatorView });
`);
if (controlResult.left !== 'left' || controlResult.right !== 'right') throw new Error(`Spectator controls failed: ${JSON.stringify(controlResult)}`);

const normalizedScenario = async (view) => evaluate(`
  (() => {
    window.__startWatchAiMatch('hard', 'hard', 8802);
    window.__uiState.spectatorView = '${view}';
    window.__world.teams.player.gold = 750;
    const purchase = window.__buyRaven('player');
    window.__forceTicks(300);
    const normalize = (value) => JSON.stringify({
      time: value.matchElapsedTime,
      teams: Object.fromEntries(Object.entries(value.teams).map(([team, state]) => [team, {
        gold: state.gold, spent: state.goldSpent, command: state.command, buildIndex: state.buildIndex,
        queue: state.productionQueue.map(({ action, kind }) => ({ action, kind })), ravenCooldownTimer: state.ravenCooldownTimer,
      }])),
      ravens: value.ravens.map(({ id, ...raven }) => raven),
      visionSources: value.visionSources.map(({ ravenId, ...source }) => source),
    });
    return { purchase, snapshot: normalize(window.__world) };
  })()
`);
const full = await normalizedScenario('full');
const left = await normalizedScenario('left');
const right = await normalizedScenario('right');
if (!full.purchase.ok || !left.purchase.ok || !right.purchase.ok) throw new Error('Debug Raven purchase failed in browser scenario.');
if (full.snapshot !== left.snapshot || full.snapshot !== right.snapshot) throw new Error('Spectator perspective changed deterministic Raven simulation state.');

await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 8803);
  window.__world.teams.player.gold = 750; window.__buyRaven('player');
  window.__uiState.spectatorView = 'full'; window.__forceTicks(300);
  window.__camera.x = 700; window.__camera.targetX = 700; window.__forceTicks(0);
`);
await screenshot('player-inflight-full');
for (const view of ['left', 'right']) {
  await evaluate(`window.__uiState.spectatorView = '${view}'; window.__forceTicks(0);`);
  await screenshot(`player-inflight-${view}`);
}
const playerReveal = await evaluate(`window.__uiState.spectatorView = 'left'; window.__forceTicks(400); window.__camera.x = 3300; window.__camera.targetX = 3300; window.__forceTicks(0); ({ state: window.__world.ravens[0]?.state, sources: window.__world.visionSources.filter((source) => source.ravenId != null).map(({ ravenSource, radius }) => ({ ravenSource, radius })) });`);
if (playerReveal.state !== 'revealing' || !playerReveal.sources.some((source) => source.ravenSource === 'reveal' && source.radius === 800)) throw new Error(`Player Raven did not enter configured reveal: ${JSON.stringify(playerReveal)}`);
await screenshot('player-reveal-left');
const playerExpired = await evaluate(`window.__forceTicks(601); ({ ravenCount: window.__world.ravens.length, sources: window.__world.visionSources.filter((source) => source.ravenId != null).length });`);
if (playerExpired.sources !== 0) throw new Error(`Raven temporary sources remained after reveal expiry: ${JSON.stringify(playerExpired)}`);
await screenshot('player-post-reveal-left');

const aiStates = await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 8804);
  window.__world.teams.ai.gold = 750; const purchase = window.__buyRaven('ai');
  window.__uiState.spectatorView = 'right'; window.__forceTicks(300);
  window.__camera.x = 2500; window.__camera.targetX = 2500; window.__forceTicks(0);
  ({ purchase, state: window.__world.ravens[0]?.state, direction: window.__world.ravens[0]?.direction, x: window.__world.ravens[0]?.x });
`);
if (!aiStates.purchase.ok || aiStates.state !== 'flying' || aiStates.direction !== -1) throw new Error(`Right Raven browser flight contract failed: ${JSON.stringify(aiStates)}`);
await screenshot('ai-inflight-right');
const aiReveal = await evaluate(`window.__forceTicks(400); window.__camera.x = 550; window.__camera.targetX = 550; window.__forceTicks(0); ({ state: window.__world.ravens[0]?.state, sources: window.__world.visionSources.filter((source) => source.ravenId != null).map(({ ravenSource, radius }) => ({ ravenSource, radius })) });`);
if (aiReveal.state !== 'revealing' || !aiReveal.sources.some((source) => source.ravenSource === 'reveal' && source.radius === 800)) throw new Error(`Right Raven did not enter configured reveal: ${JSON.stringify(aiReveal)}`);
await screenshot('ai-reveal-right');
if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
ws.close();
console.log(JSON.stringify({
  appUrl,
  controlResult,
  deterministic: { fullEqualsLeft: full.snapshot === left.snapshot, fullEqualsRight: full.snapshot === right.snapshot, snapshotBytes: full.snapshot.length },
  playerReveal,
  playerExpired,
  aiStates,
  aiReveal,
  screenshots: [
    'artifacts/raven-browser/player-inflight-full.png',
    'artifacts/raven-browser/player-inflight-left.png',
    'artifacts/raven-browser/player-inflight-right.png',
    'artifacts/raven-browser/player-reveal-left.png',
    'artifacts/raven-browser/player-post-reveal-left.png',
    'artifacts/raven-browser/ai-inflight-right.png',
    'artifacts/raven-browser/ai-reveal-right.png',
  ],
}, null, 2));
