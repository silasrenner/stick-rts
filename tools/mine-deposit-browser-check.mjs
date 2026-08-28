import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9333);
const APP_URL = process.env.APP_URL || `http://192.168.0.83:8861/?mine-deposit-browser-check=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
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

const target = await openTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

for (let i = 0; i < 30; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (i === 29) throw new Error('Game did not initialize');
}

const result = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createUnit } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  world.units.length = 0;
  const miners = Array.from({ length: 4 }, () => createUnit('miner', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y));
  world.units.push(...miners);
  window.__forceTicks(1);
  for (const miner of miners) miner.x = world.mines.player.deposits[miner.mineDepositIndex].x;
  window.__forceTicks(1);
  return {
    deposits: world.mines.player.deposits.map(({ x, y }) => ({ x, y })),
    minerAssignments: miners.map(({ mineDepositIndex, miningState, x }) => ({ mineDepositIndex, miningState, x })),
  };
})()`);

const assignmentCounts = result.minerAssignments.reduce((counts, { mineDepositIndex }) => {
  counts[mineDepositIndex] = (counts[mineDepositIndex] ?? 0) + 1;
  return counts;
}, {});
if (result.deposits.length !== 3) throw new Error(`Expected three rendered deposits, got ${JSON.stringify(result.deposits)}.`);
if (JSON.stringify(assignmentCounts) !== JSON.stringify({ 0: 2, 1: 1, 2: 1 })) throw new Error(`Expected visible 2/1/1 split, got ${JSON.stringify({ result, assignmentCounts })}.`);
if (!result.minerAssignments.every(({ miningState }) => miningState === 'mining')) throw new Error(`Expected the four assigned miners to be actively mining; got ${JSON.stringify(result.minerAssignments)}.`);

const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = join('artifacts', 'screenshots', 'mine-deposit-browser.png');
mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, ...result, assignmentCounts, screenshotPath }, null, 2));
