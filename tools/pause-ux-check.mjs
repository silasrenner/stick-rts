// Pause/exit browser regression check. Requires a local server and Chrome CDP.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8034/?pause-ux-check=${Date.now()}`;
async function openTarget(url) { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (!r.ok) throw new Error(`CDP target failed: ${r.status}`); return r.json(); }
function connect(url) { const ws = new WebSocket(url); let id = 0; const pending = new Map(); const errors = []; ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (!m.id) { if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); return; } const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }; const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; }); const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }); return { ws, ready, send, errors }; }
const target = await openTarget('about:blank'); const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl); await ready; await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: APP_URL });
async function evaluate(code) { const result = await send('Runtime.evaluate', { expression: code, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
for (let i = 0; i < 30; i += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__togglePause') === 'function') break; if (i === 29) throw new Error('Pause API did not initialize'); }
await evaluate(`window.__resetMatch('medium'); window.__forceTicks(30); window.__togglePause(); const before = { tick: window.__tickCount(), gold: window.__world.teams.player.gold, elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused }; window.__forceTicks(120); window.__pauseCheckBefore = before;`);
const frozen = await evaluate(`({ before: window.__pauseCheckBefore, after: { tick: window.__tickCount(), gold: window.__world.teams.player.gold, elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused } })`);
if (!frozen.before.paused || frozen.after.tick !== frozen.before.tick || frozen.after.gold !== frozen.before.gold || frozen.after.elapsed !== frozen.before.elapsed) throw new Error(`Pause must freeze tick, gold, and elapsed time: ${JSON.stringify(frozen)}`);
await evaluate(`window.__togglePause(); window.__forceTicks(60);`);
const resumed = await evaluate(`({ paused: window.__uiState.paused, tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime })`);
if (resumed.paused || resumed.tick <= frozen.after.tick || resumed.elapsed <= frozen.after.elapsed) throw new Error(`Resume must continue the same match: ${JSON.stringify({ frozen, resumed })}`);
await evaluate(`window.__startWatchAiMatch('easy', 'hard', 1); window.__forceTicks(30); window.__togglePause(); const watchBefore = { tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused }; window.__forceTicks(120); window.__watchPauseCheck = { before: watchBefore, after: { tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused } };`);
const watch = await evaluate('window.__watchPauseCheck');
if (!watch.before.paused || watch.after.tick !== watch.before.tick || watch.after.elapsed !== watch.before.elapsed) throw new Error(`Watch AI pause must freeze the simulation: ${JSON.stringify(watch)}`);
await evaluate('window.__togglePause()');
for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 108, y: 521, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const watchPauseButton = await evaluate('window.__uiState.paused');
if (!watchPauseButton) throw new Error('Watch pause button beside the speed multiplier did not pause the match');
for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 108, y: 521, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
if (await evaluate('window.__uiState.paused')) throw new Error('Watch pause button did not resume the paused match');
await evaluate('window.__backToMenu()');
for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 700, y: 318, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
if (await evaluate('window.__uiState.menuScreen') !== 'updates') throw new Error('Update Log menu entry did not open');
for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 60, y: 34, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
if (await evaluate('window.__uiState.menuScreen') !== 'main') throw new Error('Centered Update Log Back button did not return to the menu');
ws.close(); if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`); console.log(JSON.stringify({ frozen, resumed }, null, 2));
