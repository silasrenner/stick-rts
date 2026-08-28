import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9334);
const APP_URL = process.env.APP_URL || `http://192.168.0.83:8814/?regeneration-player-fog=${Date.now()}`;
const outDir = join('artifacts', 'screenshots');

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
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
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
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
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
  if (i === 29) throw new Error('Game did not initialize.');
}

const setup = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createUnit, createTurret, createProjectile } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  world.units = [];
  world.structures = [createTurret('ai', 2520, CONFIG.GROUND_Y)];
  world.projectiles = [];
  world.ravens = [];
  world.teams.player.gold = 100;
  world.teams.ai.gold = 999;
  const scout = createUnit('warrior', 'player', 2000, CONFIG.GROUND_Y);
  const damaged = createUnit('warrior', 'player', 2050, CONFIG.GROUND_Y);
  damaged.hp = damaged.maxHp * 0.2;
  damaged.lastDamagedAt = world.matchElapsedTime;
  const enemy = createUnit('warrior', 'ai', 2500, CONFIG.GROUND_Y);
  const raven = { id: 99991, team: 'ai', x: 2500, y: CONFIG.GROUND_Y - CONFIG.RAVEN.flightAltitude, state: 'flying' };
  const projectile = createProjectile('ai', 2500, CONFIG.GROUND_Y, 2450, CONFIG.GROUND_Y, enemy.id, 1, 1000);
  world.units.push(scout, damaged, enemy);
  world.ravens.push(raven);
  world.projectiles.push(projectile);
  window.__forceTicks(1);
  // Set the review camera after the tick: production camera-follow must not
  // move the hidden-turret fixture out of the fogged center before capture.
  window.__camera.zoom = 0.7;
  window.__camera.x = 1700;
  return { enemyId: enemy.id, scoutId: scout.id, damagedId: damaged.id, turretId: world.structures[0].id };
})()`);

const hidden = await evaluate(`(async () => {
  const { isPositionVisibleToTeam } = await import('/src/sim/vision.js');
  const world = window.__world;
  const enemy = world.units.find((u) => u.id === ${setup.enemyId});
  const scout = world.units.find((u) => u.id === ${setup.scoutId});
  const turret = world.structures.find((s) => s.id === ${setup.turretId});
  return { enemyVisible: Math.abs(enemy.x - scout.x) <= 340, turretPresent: !!turret, turretVisible: isPositionVisibleToTeam(world, 'player', turret.x, turret.y), turretX: turret.x, enemyX: enemy.x, scoutX: scout.x };
})()`);
if (hidden.enemyVisible || !hidden.turretPresent) throw new Error(`Invalid hidden-fog setup: ${JSON.stringify(hidden)}`);
mkdirSync(outDir, { recursive: true });
const hiddenShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(outDir, 'player-fog-hidden.png'), hiddenShot.data, 'base64');

const revealed = await evaluate(`(() => {
  const world = window.__world;
  const scout = world.units.find((u) => u.id === ${setup.scoutId});
  const enemy = world.units.find((u) => u.id === ${setup.enemyId});
  scout.x = enemy.x;
  window.__forceTicks(1);
  return { enemyVisible: Math.abs(enemy.x - scout.x) <= 340, enemyX: enemy.x, scoutX: scout.x };
})()`);
if (!revealed.enemyVisible) throw new Error(`Invalid reveal setup: ${JSON.stringify(revealed)}`);
const revealShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(outDir, 'player-fog-revealed.png'), revealShot.data, 'base64');

const sustain = await evaluate(`(async () => {
  const { getSustainedVisionSamples } = await import('/src/render/visionMemory.js');
  const world = window.__world;
  const memory = window.__uiState.visionMemory;
  window.__uiState.paused = true;
  // Remove all live Player sight sources; only renderer-owned history remains.
  world.units = [];
  world.structures = [];
  world.statues = {};
  world.visionSources = [];
  const lastSeenAt = Math.max(...memory.samples.map((sample) => sample.seenAt));
  world.matchElapsedTime = lastSeenAt + 10;
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sustained = getSustainedVisionSamples(memory, world.matchElapsedTime);
  world.matchElapsedTime = lastSeenAt + 11;
  await new Promise((resolve) => setTimeout(resolve, 100));
  const fading = getSustainedVisionSamples(memory, world.matchElapsedTime);
  world.matchElapsedTime = lastSeenAt + 12;
  await new Promise((resolve) => setTimeout(resolve, 100));
  const expired = getSustainedVisionSamples(memory, world.matchElapsedTime);
  const latestAlpha = (samples) => samples.reduce((latest, sample) => sample.seenAt > latest.seenAt ? sample : latest).alpha;
  return {
    sustainedAlpha: latestAlpha(sustained),
    fadingAlpha: latestAlpha(fading),
    expiredCount: expired.length,
  };
})()`);
if (sustain.sustainedAlpha !== 1 || Math.abs(sustain.fadingAlpha - 0.5) > 1e-9 || sustain.expiredCount !== 0) {
  throw new Error(`Browser vision sustain timing failed: ${JSON.stringify(sustain)}`);
}
const sustainShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(outDir, 'player-vision-sustain-expired.png'), sustainShot.data, 'base64');

const healing = await evaluate(`(async () => {
  const { createUnit } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  window.__resetMatch('medium');
  const world = window.__world;
  world.teams.player.gold = 100;
  world.teams.ai.gold = 999;
  // Isolate a real Player unit so no combat event can reset healing during the
  // browser timing proof after the sustain visualization fixture.
  const damaged = createUnit('warrior', 'player', 1000, CONFIG.GROUND_Y);
  world.units = [damaged];
  world.structures = [];
  world.projectiles = [];
  world.ravens = [];
  damaged.hp = damaged.maxHp * 0.2;
  damaged.lastDamagedAt = world.matchElapsedTime;
  const before = damaged.hp;
  window.__uiState.paused = false;
  window.__forceTicks(Math.round(19 * 60));
  const beforeDelay = damaged.hp;
  window.__forceTicks(Math.round(151 * 60));
  return { before, beforeDelay, after: damaged.hp, maxHp: damaged.maxHp, elapsed: world.matchElapsedTime };
})()`);
if (healing.before !== healing.beforeDelay || healing.after !== healing.maxHp) throw new Error(`Browser regeneration timing failed: ${JSON.stringify(healing)}`);

const telemetry = await evaluate(`(() => {
  const calls = [];
  const original = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { calls.push(String(text)); return original.call(this, text, ...args); };
  try { window.__forceTicks(1); } finally { CanvasRenderingContext2D.prototype.fillText = original; }
  return { hiddenGoldDifferentialRendered: calls.includes('899 gold'), playerGoldRendered: calls.includes('Gold: 100'), calls };
})()`);
if (telemetry.hiddenGoldDifferentialRendered || !telemetry.playerGoldRendered) throw new Error(`Player-vs-AI telemetry visibility failed: ${JSON.stringify(telemetry)}`);

ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
const result = {
  appUrl: APP_URL,
  hidden,
  revealed,
  sustain,
  healing,
  telemetry,
  screenshots: [
    join(outDir, 'player-fog-hidden.png'),
    join(outDir, 'player-fog-revealed.png'),
    join(outDir, 'player-vision-sustain-expired.png'),
  ],
};
writeFileSync('artifacts/player-fog-regeneration-browser-result.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
