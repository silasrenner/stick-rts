const CDP_PORT = Number(process.env.CDP_PORT || 9333);
const APP_URL = process.env.APP_URL || `http://192.168.0.83:8827/?review=defend-turret-balance-${Date.now()}`;

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
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

for (let i = 0; i < 30; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (i === 29) throw new Error('Game did not initialize.');
}

await evaluate(`(() => {
  window.__resetMatch('medium');
  const turret = (id, x) => ({ id, team: 'player', x, y: 440, isStructure: true, isTurret: true, isStartingTurret: false, state: 'idle', hp: 450, maxHp: 450, range: 700, acquireRange: 700, damage: 42.84, attackCooldown: 1.8, attackTimer: 0, attackAnimTimer: 0, projectileSpeed: 320, targetId: null });
  window.__world.structures.push(turret(9001, 480), turret(9002, 1000), turret(9003, 1520));
})()`);

async function pressDefend() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
  return evaluate('window.__world.teams.player.defendAnchorIndex');
}

const anchors = [await pressDefend(), await pressDefend(), await pressDefend(), await pressDefend()];
if (anchors.join(',') !== '0,1,2,2') throw new Error(`Real W input must select inner → second → third and clamp; got ${anchors}.`);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, anchors, screenshotBytes: screenshot.data.length }, null, 2));
