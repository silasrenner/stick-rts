import { writeFile } from 'node:fs/promises';

const CDP_PORT = 9227;
const APP_URL = `http://192.168.0.83:8811/?heroes-towers-queue-review=${Date.now()}`;
const screenshotPath = new URL('../artifacts/screenshots/build-menu-active-browser.png', import.meta.url);

const targetResponse = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
if (!targetResponse.ok) throw new Error(`Could not open CDP target: ${targetResponse.status}`);
const target = await targetResponse.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
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
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*favicon.ico*'] });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
await new Promise((resolve) => setTimeout(resolve, 700));
const result = await evaluate(`(() => {
  window.__resetMatch('medium');
  window.__world.teams.player.gold = 10_000;
  const structurePurchase = window.__buyStructure('player');
  window.__forceTicks(300);
  const heroPurchase = window.__buyHero('player', 'vanguard');
  return {
    queueLength: window.__world.teams.player.productionQueue.length,
    structurePurchase,
    activeItem: window.__world.teams.player.productionQueue[0],
    heroPurchase,
    heroUnits: window.__world.units.filter((unit) => unit.isHero).length,
    canvas: { width: document.querySelector('#game').width, height: document.querySelector('#game').height },
  };
})()`);
const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
if (result.queueLength !== 1 || !result.structurePurchase?.ok || result.activeItem?.action !== 'structure' || !(result.activeItem?.remaining > 0 && result.activeItem.remaining < result.activeItem.total) || result.heroPurchase?.ok || result.heroPurchase?.reason !== 'heroesDisabled' || result.heroUnits !== 0) {
  throw new Error(`Browser scenario setup did not reach expected state: ${JSON.stringify(result)}`);
}
if (consoleErrors.length > 0) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
ws.close();
console.log(JSON.stringify({ appUrl: APP_URL, result, screenshot: screenshotPath.pathname, consoleErrors }, null, 2));
