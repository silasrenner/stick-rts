import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const CDP_PORT = Number(process.env.CDP_PORT || 9341);
const APP_URL = process.env.APP_URL || 'http://192.168.0.83:8811/?fog-residual-profile';
const OUT_PATH = process.env.OUT_PATH || 'artifacts/fog-residual-lag-profile-result.json';
const LAN_RENDERER_SHA256 = createHash('sha256').update(Buffer.from(await (await fetch(new URL('/src/render/renderer.js', APP_URL))).arrayBuffer())).digest('hex');
const WORKTREE_RENDERER_SHA256 = createHash('sha256').update(readFileSync('src/render/renderer.js')).digest('hex');
if (LAN_RENDERER_SHA256 !== WORKTREE_RENDERER_SHA256) throw new Error(`LAN renderer mismatch: ${LAN_RENDERER_SHA256} != ${WORKTREE_RENDERER_SHA256}`);

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target failed: ${response.status}`);
  return response.json();
}
function connect(url) {
  const ws = new WebSocket(url); let id = 0; const pending = new Map();
  ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) return; const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  return { ws, ready, send: (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }) };
}
function percentile(values, p) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * p)] ?? 0; }
function profileTimes(profile) {
  const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName || '(anonymous)']));
  const totals = {};
  for (let index = 1; index < profile.samples.length; index += 1) {
    const name = names.get(profile.samples[index]) ?? '(unknown)';
    totals[name] = (totals[name] ?? 0) + (profile.timeDeltas[index] ?? 0) / 1000;
  }
  return Object.fromEntries(Object.entries(totals).filter(([name]) => ['render', 'drawVisionFog', 'updateVisionMemory', 'getSustainedVisionSamples', 'getTeamVisionSources', 'isPositionVisibleToTeam', 'visibleThroughFogClearance'].includes(name)).sort());
}

const target = await openTarget('about:blank');
const { ws, ready, send } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Profiler.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
for (let attempt = 0; attempt < 40; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (attempt === 39) throw new Error('Game did not initialize'); }

const setup = await evaluate(`(async () => {
  const { createUnit } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  window.__resetMatch('medium');
  const world = window.__world;
  window.__uiState.paused = true;
  world.units = [];
  world.structures = [];
  world.ravens = [];
  world.visionSources = [];
  for (let index = 0; index < 80; index += 1) {
    const player = createUnit(index % 2 ? 'warrior' : 'archer', 'player', 500 + (index % 20) * 45, CONFIG.GROUND_Y);
    const enemy = createUnit(index % 2 ? 'warrior' : 'archer', 'ai', 2200 + (index % 20) * 45, CONFIG.GROUND_Y);
    world.units.push(player, enemy);
  }
  const originalRender = window.requestAnimationFrame;
  let active = false;
  let frame = 0;
  window.__fogProfile = {
    apply(control) {
      Object.assign(CONFIG, control.config);
      window.__uiState.visionMemory = { samples: [], lastSampleAtByKey: new Map(), lastSampleByKey: new Map() };
      world.matchElapsedTime = 0;
      world.projectiles = [];
      for (let i = 0; i < 80; i += 1) {
        const player = world.units[i * 2];
        const enemy = world.units[i * 2 + 1];
        Object.assign(player, { x: 500 + (i % 20) * 45, y: CONFIG.GROUND_Y, hp: player.maxHp, state: 'idle', targetId: null, attackAnimTimer: 0 });
        Object.assign(enemy, { x: 2200 + (i % 20) * 45, y: CONFIG.GROUND_Y, hp: enemy.maxHp, state: 'idle', targetId: null, attackAnimTimer: 0 });
      }
      frame = 0; active = true; window.__uiState.paused = false;
    },
    stop() { active = false; },
    start() {
      const tick = () => {
        if (active) {
          frame += 1;
          const t = frame / 4;
          for (let i = 0; i < 80; i += 1) {
            const unit = world.units[i * 2];
            unit.x = 500 + (i % 20) * 45 + Math.sin(t + i) * 210;
          }
          world.matchElapsedTime += 0.25;
        }
        originalRender(tick);
      };
      originalRender(tick);
    },
    snapshot() { return { units: world.units.length, samples: window.__uiState.visionMemory.samples.length, speed: window.__uiState.speed }; },
  };
  window.__fogProfile.start();
  return { units: world.units.length, movingSourceCount: 80, stationarySourceCount: 1, retainedSampleCeiling: 80 * CONFIG.VISION_MEMORY_MAX_SAMPLES_PER_SOURCE + 1 };
})()`);

const controls = [
  { name: 'transparent-veil-draw-path-retained', config: { PLAYER_FOG_ALPHA: 0, PLAYER_FOG_COLOR: 'rgba(225,232,240,0)', PLAYER_FOG_FEATHER: 0, PLAYER_FOG_BOUNDARY_FEATHER: 0, VISION_SUSTAIN_SECONDS: 0, VISION_FADE_SECONDS: 0 } },
  { name: 'current-sources-flat-clearance', config: { PLAYER_FOG_ALPHA: 0.30, PLAYER_FOG_COLOR: 'rgba(225,232,240,0.075)', PLAYER_FOG_FEATHER: 0, PLAYER_FOG_BOUNDARY_FEATHER: 0, VISION_SUSTAIN_SECONDS: 0, VISION_FADE_SECONDS: 0 } },
  { name: 'current-plus-sustained-flat-clearance', config: { PLAYER_FOG_ALPHA: 0.30, PLAYER_FOG_COLOR: 'rgba(225,232,240,0.075)', PLAYER_FOG_FEATHER: 0, PLAYER_FOG_BOUNDARY_FEATHER: 0, VISION_SUSTAIN_SECONDS: 10, VISION_FADE_SECONDS: 2 } },
  { name: 'current-player-fog', config: { PLAYER_FOG_ALPHA: 0.30, PLAYER_FOG_COLOR: 'rgba(225,232,240,0.075)', PLAYER_FOG_FEATHER: 36, PLAYER_FOG_BOUNDARY_FEATHER: 24, VISION_SUSTAIN_SECONDS: 10, VISION_FADE_SECONDS: 2 } },
];
const results = [];
for (const speed of [5, 10, 20]) {
  for (const control of controls) {
    await evaluate(`window.__uiState.speed = ${speed}; window.__fogProfile.apply(${JSON.stringify(control)});`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await send('Profiler.start');
    const stamps = await evaluate(`new Promise((resolve) => { const stamps = []; const frame = (time) => { stamps.push(time); stamps.length >= 241 ? resolve(stamps) : requestAnimationFrame(frame); }; requestAnimationFrame(frame); })`);
    const stopped = await send('Profiler.stop');
    const deltas = stamps.slice(1).map((time, index) => time - stamps[index]);
    results.push({ speed, control: control.name, frameMs: { median: percentile(deltas, 0.5), p95: percentile(deltas, 0.95), max: Math.max(...deltas) }, cpuProfileMs: profileTimes(stopped.profile), counts: await evaluate('window.__fogProfile.snapshot()') });
  }
}
await evaluate('window.__fogProfile.stop()');
ws.close();
const output = { schema: 1, appUrl: APP_URL, rendererSha256: LAN_RENDERER_SHA256, setup, controls: controls.map(({ name }) => name), results, caveat: 'The transparent control retains the production fog draw path because no production fog-off gate exists; it is a visual-control baseline, not a true no-fog CPU baseline.' };
writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
