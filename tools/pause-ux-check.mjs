import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Pause/exit/speed browser regression check. Requires a local server and Chrome CDP.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8034/?pause-ux-check=${Date.now()}`;
async function openTarget(url) { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (!r.ok) throw new Error(`CDP target failed: ${r.status}`); return r.json(); }
function connect(url) { const ws = new WebSocket(url); let id = 0; const pending = new Map(); const errors = []; ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (!m.id) { if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); return; } const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }; const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; }); const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }); return { ws, ready, send, errors }; }
const target = await openTarget('about:blank'); const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl); await ready; await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: APP_URL });
async function evaluate(code) { const result = await send('Runtime.evaluate', { expression: code, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); }
for (let i = 0; i < 30; i += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__togglePause') === 'function') break; if (i === 29) throw new Error('Pause API did not initialize'); }

// Escape opens the Player-vs-AI pause menu; the selector then changes rate without resuming.
await evaluate(`window.__resetMatch('medium'); window.__forceTicks(30);`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await evaluate(`window.__playerPauseCheckBefore = { tick: window.__tickCount(), gold: window.__world.teams.player.gold, elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused, speed: window.__uiState.speed };`);
const playerInitial = await evaluate('window.__playerPauseCheckBefore');
if (!playerInitial.paused) throw new Error(`Escape must open the Player-vs-AI pause menu: ${JSON.stringify(playerInitial)}`);
if (playerInitial.speed !== 5) throw new Error(`Player-vs-AI must begin at 5×: ${JSON.stringify(playerInitial)}`);
// Intended center of the new pause-overlay Game Speed button; it must not trigger Resume.
await click(700, 285);
const playerAfterSpeedClick = await evaluate(`({ tick: window.__tickCount(), gold: window.__world.teams.player.gold, elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused, speed: window.__uiState.speed })`);
if (!playerAfterSpeedClick.paused || playerAfterSpeedClick.speed !== 10 || playerAfterSpeedClick.tick !== playerInitial.tick || playerAfterSpeedClick.gold !== playerInitial.gold || playerAfterSpeedClick.elapsed !== playerInitial.elapsed) throw new Error(`Pause-menu speed control must select 10× while simulation stays frozen: ${JSON.stringify({ playerInitial, playerAfterSpeedClick })}`);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = join('artifacts', 'screenshots', 'pvai-pause-speed-overlay.png');
mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
writeFileSync(screenshotPath, screenshot.data, 'base64');
await click(700, 333);
const playerResumed = await evaluate(`({ paused: window.__uiState.paused, speed: window.__uiState.speed })`);
if (playerResumed.paused || playerResumed.speed !== 10) throw new Error(`Resume must preserve the selected speed: ${JSON.stringify(playerResumed)}`);
await evaluate(`window.__forceTicks(60);`);
const playerAdvanced = await evaluate(`({ tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime })`);
if (playerAdvanced.tick <= playerAfterSpeedClick.tick || playerAdvanced.elapsed <= playerAfterSpeedClick.elapsed) throw new Error(`Resume must continue the same Player-vs-AI match: ${JSON.stringify({ playerAfterSpeedClick, playerAdvanced })}`);

// A fresh Player-vs-AI match restores the requested 5× baseline.
await evaluate(`window.__resetMatch('medium'); window.__playerResetSpeed = window.__uiState.speed;`);
if (await evaluate('window.__playerResetSpeed') !== 5) throw new Error('Fresh Player-vs-AI match must reset speed to 5×');

// A controlled frame-time seam proves the fixed-timestep accumulator receives the selected rate.
const speedRatio = await evaluate(`const fiveStart = window.__tickCount(); window.__advanceSimulation(100); const fiveTicks = window.__tickCount() - fiveStart; window.__uiState.speed = 10; const tenStart = window.__tickCount(); window.__advanceSimulation(100); const tenTicks = window.__tickCount() - tenStart; window.__togglePause(); const pausedStart = window.__tickCount(); window.__advanceSimulation(100); ({ fiveTicks, tenTicks, pausedTicks: window.__tickCount() - pausedStart, paused: window.__uiState.paused })`);
if (speedRatio.fiveTicks <= 0 || speedRatio.tenTicks !== speedRatio.fiveTicks * 2 || speedRatio.pausedTicks !== 0 || !speedRatio.paused) throw new Error(`Selected rate must scale fixed ticks and pause must advance none: ${JSON.stringify(speedRatio)}`);
await evaluate('window.__togglePause()');

// Watch AI starts at the same baseline, preserves pause behavior, and its compact selector still cycles.
await evaluate(`window.__startWatchAiMatch('easy', 'hard', 1); window.__forceTicks(30); window.__togglePause(); const before = { tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused, speed: window.__uiState.speed }; window.__watchPauseCheck = { before, after: { tick: window.__tickCount(), elapsed: window.__world.matchElapsedTime, paused: window.__uiState.paused, speed: window.__uiState.speed } };`);
const watch = await evaluate('window.__watchPauseCheck');
if (watch.before.speed !== 5 || !watch.before.paused || watch.after.tick !== watch.before.tick || watch.after.elapsed !== watch.before.elapsed) throw new Error(`Watch AI must begin at 5× and pause must freeze simulation: ${JSON.stringify(watch)}`);
await evaluate('window.__togglePause()');
await click(33, 521);
const watchSpeed = await evaluate('window.__uiState.speed');
if (watchSpeed !== 10) throw new Error(`Watch speed selector must cycle from 5× to 10×: ${watchSpeed}`);
await click(108, 521);
const watchPauseButton = await evaluate('window.__uiState.paused');
if (!watchPauseButton) throw new Error('Watch pause button beside the speed multiplier did not pause the match');
await click(108, 521);
if (await evaluate('window.__uiState.paused')) throw new Error('Watch pause button did not resume the paused match');

await evaluate('window.__backToMenu()');
await click(700, 318);
if (await evaluate('window.__uiState.menuScreen') !== 'updates') throw new Error('Update Log menu entry did not open');
await click(60, 34);
if (await evaluate('window.__uiState.menuScreen') !== 'main') throw new Error('Centered Update Log Back button did not return to the menu');
ws.close(); if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`); console.log(JSON.stringify({ playerInitial, playerAfterSpeedClick, playerResumed, speedRatio, watch }, null, 2));
