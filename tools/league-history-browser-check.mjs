// Focused same-origin browser regression for the Strategy League menu screen.
// Requires a companion on APP_URL and Chrome CDP on CDP_PORT.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:8811/';

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
async function evaluate(code) {
  const result = await send('Runtime.evaluate', { expression: code, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__uiState === "object"')) break;
  if (attempt === 29) throw new Error('Game did not initialize');
}
// The third main-menu button is Strategy League at this fixed desktop size.
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 318, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 318, button: 'left', buttons: 0, clickCount: 1 });
let state;
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  state = await evaluate('window.__uiState.menuScreen === "leagueHistory" ? window.__uiState.leagueHistory : null');
  if (state?.status === 'ready') break;
}
ws.close();
if (!state || state.status !== 'ready') throw new Error(`Strategy League history did not load from the same-origin companion: ${JSON.stringify(state)}`);
if (state.view.matches !== 2 || state.view.wins.red !== 1 || state.view.wins.blue !== 1
  || state.view.recent.length !== 2 || state.view.recent[0].winner !== 'blue'
  || state.view.profiles.red.revision !== 1 || state.view.profiles.red.status !== 'reviewed'
  || state.view.profiles.blue.status !== 'pending-provider') {
  throw new Error(`Strategy League history rendered an unexpected companion projection: ${JSON.stringify(state.view)}`);
}
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log('PASS — main-menu Strategy League loads bounded aggregate, recent results, and profile status from the same-origin companion.');
