import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9444);
const APP_URL = process.env.APP_URL || `http://192.168.86.75:8811/?core-turret-miner-map-spacing=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not open CDP target: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const pageErrors = [];
  const resourceErrors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.text);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') pageErrors.push(message.params.entry.text);
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
        resourceErrors.push({ status: message.params.response.status, url: message.params.response.url });
      }
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
  return { ws, ready, send, pageErrors, resourceErrors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, pageErrors, resourceErrors } = connect(target.webSocketDebuggerUrl);
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

for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (attempt === 29) throw new Error(`Game module did not initialize; page errors: ${JSON.stringify(pageErrors)}`);
}

const layout = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createUnit, getCoreDeliveryX } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  for (const team of ['player', 'ai']) {
    const x = getCoreDeliveryX(team);
    world.units.push(createUnit('miner', team, x, CONFIG.GROUND_Y));
  }
  window.__camera.zoom = 1;
  window.__camera.x = 0;
  window.__camera.targetX = 0;
  window.__forceTicks(1);
  const teamLayout = (team) => {
    const turret = world.structures.find((entity) => entity.team === team && entity.isStartingTurret);
    const home = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
    const sign = team === 'player' ? 1 : -1;
    const miner = world.units.find((unit) => unit.team === team && unit.isMiner);
    return {
      home,
      turretX: turret.x,
      deliveryX: getCoreDeliveryX(team),
      minerX: miner.x,
      deposits: world.mines[team].deposits.map((deposit) => deposit.x),
      ordered: sign * (turret.x - home) > 0 && sign * (miner.x - turret.x) > 0 && world.mines[team].deposits.every((deposit) => sign * (deposit.x - miner.x) > 0),
    };
  };
  return {
    worldWidth: CONFIG.WORLD_WIDTH,
    minimumZoom: CONFIG.CAMERA_ZOOM_MIN,
    expectedMinimumZoom: CONFIG.VIEWPORT_WIDTH / CONFIG.WORLD_WIDTH,
    player: teamLayout('player'),
    ai: teamLayout('ai'),
  };
})()`);

if (layout.worldWidth !== 7000) throw new Error(`Browser received wrong world width: ${JSON.stringify(layout)}`);
if (layout.minimumZoom !== layout.expectedMinimumZoom) throw new Error(`Browser received stale full-map zoom: ${JSON.stringify(layout)}`);
if (!layout.player.ordered || !layout.ai.ordered) throw new Error(`Browser layout order overlaps base landmarks: ${JSON.stringify(layout)}`);

const refinement = await evaluate(`(async () => {
  const { createProjectile, createTurret, createUnit } = await import('/src/sim/world.js');
  const { updateFormationSlots } = await import('/src/sim/systems/formation.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  const team = 'player';
  const homeX = CONFIG.PLAYER_HOME_X;
  for (const offset of CONFIG.TURRET_SLOT_OFFSETS.slice(0, 2)) world.structures.push(createTurret(team, homeX + offset, CONFIG.GROUND_Y));
  const warrior = createUnit('warrior', team, homeX, CONFIG.GROUND_Y);
  const archer = createUnit('archer', team, homeX, CONFIG.GROUND_Y);
  const catapult = createUnit('catapult', team, homeX, CONFIG.GROUND_Y);
  world.units.push(warrior, archer, catapult);
  world.teams.player.defendAnchorIndex = 0;
  updateFormationSlots(world);
  // Present the deterministic slots directly; this fixture reviews placement,
  // not the time needed for a live army to walk from home to the turret.
  for (const unit of [warrior, archer, catapult]) unit.x = unit.slotX;
  world.projectiles.push(createProjectile(team, catapult.slotX, CONFIG.GROUND_Y - 70, catapult.slotX + 220, CONFIG.GROUND_Y - 70, null, catapult.damage, catapult.projectileSpeed, null, catapult.projectileRadius));
  world.projectiles.at(-1).elapsed = world.projectiles.at(-1).duration / 2;
  window.__camera.zoom = 1;
  window.__camera.x = 500;
  window.__camera.targetX = 500;
  return {
    firstTurretX: homeX + CONFIG.TURRET_SLOT_OFFSETS[0],
    laterTurretX: homeX + CONFIG.TURRET_SLOT_OFFSETS[1],
    firstSlots: [warrior.slotX, archer.slotX, catapult.slotX],
    catapult: { renderScale: CONFIG.UNIT_STATS.catapult.renderScale, cost: CONFIG.UNIT_STATS.catapult.cost, speed: catapult.speed, cooldown: catapult.attackCooldown, projectileSpeed: catapult.projectileSpeed, projectileRadius: catapult.projectileRadius, projectileRadiusInWorld: world.projectiles.at(-1).radius },
  };
})()`);

if (!refinement.firstSlots.every((slot) => slot > refinement.firstTurretX) || !(refinement.firstSlots[0] > refinement.firstSlots[1] && refinement.firstSlots[1] > refinement.firstSlots[2])) throw new Error(`First built turret browser formation must be entirely in front in Warrior→Archer→Catapult order: ${JSON.stringify(refinement)}`);
if (JSON.stringify(refinement.catapult) !== JSON.stringify({ renderScale: 3, cost: 1050, speed: 90, cooldown: 4.5, projectileSpeed: 110, projectileRadius: 9, projectileRadiusInWorld: 9 })) throw new Error(`Browser Catapult refinement contract failed: ${JSON.stringify(refinement)}`);

mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
const screenshotPath = join('artifacts', 'screenshots', 'core-turret-miner-map-spacing-browser.png');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(screenshotPath, screenshot.data, 'base64');
const later = await evaluate(`(async () => {
  const { updateFormationSlots } = await import('/src/sim/systems/formation.js');
  const world = window.__world;
  world.teams.player.defendAnchorIndex = 1;
  updateFormationSlots(world);
  const [warrior, archer, catapult] = world.units.filter((unit) => ['warrior', 'archer', 'catapult'].includes(unit.kind));
  for (const unit of [warrior, archer, catapult]) unit.x = unit.slotX;
  window.__camera.x = 900;
  window.__camera.targetX = 900;
  return { laterTurretX: 1320, slots: [warrior.slotX, archer.slotX, catapult.slotX] };
})()`);
if (!later.slots.every((slot) => slot < later.laterTurretX) || !(later.slots[0] > later.slots[1] && later.slots[1] > later.slots[2])) throw new Error(`Later built turret browser formation must remain entirely behind in Warrior→Archer→Catapult order: ${JSON.stringify(later)}`);
const laterScreenshotPath = join('artifacts', 'screenshots', 'core-turret-miner-map-spacing-later-turret-browser.png');
const laterScreenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(laterScreenshotPath, laterScreenshot.data, 'base64');
ws.close();
const unexpectedResources = resourceErrors.filter(({ url }) => !url.endsWith('/favicon.ico'));
const unexpectedLogs = pageErrors.filter((error) => error !== 'Failed to load resource: the server responded with a status of 404 (File not found)');
if (unexpectedResources.length || unexpectedLogs.length) {
  throw new Error(`Browser errors: ${JSON.stringify({ unexpectedResources, unexpectedLogs })}`);
}
console.log(JSON.stringify({ appUrl: APP_URL, layout, refinement, later, screenshotPath, laterScreenshotPath, knownFavicon404: resourceErrors.filter(({ url }) => url.endsWith('/favicon.ico')) }, null, 2));
