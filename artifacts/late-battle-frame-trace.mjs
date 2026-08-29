import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const CDP_PORT = Number(process.env.CDP_PORT || 9342);
const APP_URL = process.env.APP_URL || 'http://192.168.0.83:8811/?late-battle-trace';
const OUT_PATH = process.env.OUT_PATH || 'artifacts/late-battle-frame-trace-result.json';
const modules = ['src/main.js', 'src/render/renderer.js', 'src/sim/tick.js'];
const moduleHashes = {};
for (const module of modules) {
  const served = Buffer.from(await (await fetch(new URL(`/${module}`, APP_URL))).arrayBuffer());
  const local = readFileSync(module);
  const servedHash = createHash('sha256').update(served).digest('hex');
  const localHash = createHash('sha256').update(local).digest('hex');
  if (servedHash !== localHash) throw new Error(`LAN source mismatch for ${module}: ${servedHash} != ${localHash}`);
  moduleHashes[module] = servedHash;
}
function percentile(values, p) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * p)] ?? 0; }
function profileTimes(profile) {
  const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName || '(anonymous)']));
  const totals = {};
  for (let index = 1; index < profile.samples.length; index += 1) {
    const name = names.get(profile.samples[index]) ?? '(unknown)';
    totals[name] = (totals[name] ?? 0) + (profile.timeDeltas[index] ?? 0) / 1000;
  }
  const selected = ['render', 'drawVisionFog', 'updateVisionMemory', 'getSustainedVisionSamples', 'getTeamVisionSources', 'updateCombat', 'updateMovement', 'updateProjectiles', 'updateAiDecisions', 'runTick'];
  return Object.fromEntries(selected.map((name) => [name, totals[name] ?? 0]));
}
async function openTarget(url) { const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (!response.ok) throw new Error(`CDP target failed: ${response.status}`); return response.json(); }
function connect(url) { const ws = new WebSocket(url); let id = 0; const pending = new Map(); ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) return; const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }; const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; }); return { ws, ready, send: (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }) }; }

async function runTrace(runNumber) {
  const target = await openTarget('about:blank');
  const { ws, ready, send } = connect(target.webSocketDebuggerUrl);
  await ready; await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Profiler.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${APP_URL}&run=${runNumber}` });
  async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
  for (let attempt = 0; attempt < 50; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (attempt === 49) throw new Error('Game did not initialize'); }
  const setup = await evaluate(`(async () => {
    const { createUnit } = await import('/src/sim/world.js');
    const { getTeamVisionSources } = await import('/src/sim/vision.js');
    const { CONFIG } = await import('/src/config.js');
    window.__resetMatch('medium');
    const world = window.__world;
    window.__uiState.paused = true;
    world.units = []; world.structures = []; world.projectiles = []; world.ravens = []; world.visionSources = [];
    for (let index = 0; index < 50; index += 1) {
      const player = createUnit(index % 2 ? 'warrior' : 'archer', 'player', 1750 + (index % 10) * 20, CONFIG.GROUND_Y);
      const ai = createUnit(index % 2 ? 'warrior' : 'archer', 'ai', 2050 + (index % 10) * 20, CONFIG.GROUND_Y);
      player.command = 'attack'; ai.command = 'attack';
      // Diagnostic fixture only: preserve an active late-game frontline for the
      // whole capture so combat/projectile work cannot collapse after one burst.
      player.hp = player.maxHp = 1_000_000_000;
      ai.hp = ai.maxHp = 1_000_000_000;
      world.units.push(player, ai);
    }
    window.__uiState.speed = 20;
    window.__uiState.visionMemory = { samples: [], lastSampleAtByKey: new Map(), lastSampleByKey: new Map() };
    window.__lateBattleTrace = { snapshot() { return { tick: window.__tickCount(), units: world.units.length, projectiles: world.projectiles.length, visionSources: getTeamVisionSources(world, 'player').length, retainedSamples: window.__uiState.visionMemory.samples.length, elapsed: world.matchElapsedTime }; } };
    return window.__lateBattleTrace.snapshot();
  })()`);
  await evaluate('window.__uiState.paused = false');
  await new Promise((resolve) => setTimeout(resolve, 500));
  await send('Profiler.start');
  const frames = await evaluate(`new Promise((resolve) => { const frames = []; let prior = window.__lateBattleTrace.snapshot(); const frame = (time) => { const next = window.__lateBattleTrace.snapshot(); frames.push({ time, ticks: next.tick - prior.tick, units: next.units, projectiles: next.projectiles, visionSources: next.visionSources, retainedSamples: next.retainedSamples, elapsed: next.elapsed }); prior = next; frames.length >= 600 ? resolve(frames) : requestAnimationFrame(frame); }; requestAnimationFrame(frame); })`);
  const stopped = await send('Profiler.stop');
  await evaluate('window.__uiState.paused = true'); ws.close();
  const deltas = frames.slice(1).map((frame, index) => frame.time - frames[index].time);
  const ticks = frames.slice(1).map((frame) => frame.ticks);
  const counts = frames.filter((_, index) => index % 30 === 0);
  return { runNumber, setup, frameMs: { median: percentile(deltas, 0.5), p95: percentile(deltas, 0.95), max: Math.max(...deltas) }, ticksPerFrame: { median: percentile(ticks, 0.5), p95: percentile(ticks, 0.95), max: Math.max(...ticks), total: ticks.reduce((sum, value) => sum + value, 0) }, cpuProfileMs: profileTimes(stopped.profile), countSnapshots: counts };
}
const runs = [await runTrace(1), await runTrace(2)];
const output = { schema: 1, mode: 'headed Chrome CDP, separate profile', appUrl: APP_URL, moduleHashes, fixture: '100 units (50 Player + 50 AI) placed in an active center battle; actual production frame/tick/render paths at 20x', runs };
writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
