import { mkdir, writeFile } from 'node:fs/promises';

const PORT = 9222;
const APP_URL = 'http://127.0.0.1:8031/?overnight=' + Date.now();
const outDir = new URL('./screenshots/', import.meta.url);
await mkdir(outDir, { recursive: true });

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not open CDP target: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') consoleErrors.push(message.params.entry.text);
  };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { ws, ready, send, consoleErrors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, consoleErrors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*favicon.ico*'] });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
await new Promise((resolve) => setTimeout(resolve, 500));

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await evaluate(`
  window.__resetMatch('medium');
  window.__world.teams.player.gold = 12345;
  window.__world.teams.player.heroCooldownTimer = 30;
  window.__world.teams.player.statueWarningTimer = 3;
  window.__world.teams.player.command = 'attack';
  const player = window.__world.teams.player;
  const sample = window.__world.units.find((unit) => unit.team === 'player');
  const playerUnits = Array.from({ length: 80 }, (_, index) => ({ ...sample, id: 10000 + index, team: 'player', kind: ['miner', 'warrior', 'archer'][index % 3], isHero: false, state: 'idle', x: 250 + index * 5, y: 440, hp: 40, maxHp: 40 }));
  const aiUnits = window.__world.units.filter((unit) => unit.team === 'ai');
  window.__world.units = [...playerUnits, ...aiUnits];
  window.__world.structures = Array.from({ length: 5 }, (_, index) => ({ id: 20000 + index, team: 'player', state: 'alive', x: 140 + index * 40, y: 440, hp: 150, maxHp: 150 }));
  player.productionQueue = [
    { action: 'hero', kind: 'forgemaster', remaining: 15, total: 30 },
    ...Array.from({ length: 24 }, (_, index) => ({ action: ['unit', 'unit', 'hero', 'structure'][index % 4], kind: ['warrior', 'archer', 'hawkeye', 'structure'][index % 4], remaining: 10, total: 10 }))
  ];
  window.__forceTicks(1);
`);

async function screenshot(name, zoom, x) {
  await evaluate(`window.__camera.zoom = ${zoom}; window.__camera.x = ${x}; window.__forceTicks(1);`);
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(new URL(name, outDir), Buffer.from(data, 'base64'));
}

await screenshot('s11-zoom-min.png', 1400 / 4200, 1400);
await screenshot('s11-zoom-default.png', 0.7, 1400);
await screenshot('s11-zoom-max.png', 1.4, 1400);

const roundTrip = await evaluate(`
  window.__camera.zoom = 0.7; window.__camera.x = 900; window.__forceTicks(1);
  const cursorX = 700;
  const before = window.__camera.x + cursorX / window.__camera.zoom;
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: cursorX, clientY: 260, bubbles: true, cancelable: true }));
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: cursorX, clientY: 260, bubbles: true, cancelable: true }));
  window.__forceTicks(1);
  const after = window.__camera.x + cursorX / window.__camera.zoom;
  ({ before, after, drift: Math.abs(after - before), zoom: window.__camera.zoom, x: window.__camera.x });
`);

const state = await evaluate(`({
  units: window.__world.units.filter((u) => u.team === 'player' && u.state !== 'dying').length,
  cap: 15 + 5 * 13,
  queue: window.__world.teams.player.productionQueue.length,
  heroCooldown: window.__world.teams.player.heroCooldownTimer,
  statueWarning: window.__world.teams.player.statueWarningTimer,
  canvas: { width: document.querySelector('#game').width, height: document.querySelector('#game').height }
})`);

await writeFile(new URL('browser-check-results.json', import.meta.url), JSON.stringify({ state, roundTrip, consoleErrors }, null, 2) + '\n');
ws.close();
console.log(JSON.stringify({ state, roundTrip, consoleErrors, screenshots: ['s11-zoom-min.png', 's11-zoom-default.png', 's11-zoom-max.png'] }, null, 2));
