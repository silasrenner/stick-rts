import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9445);
const APP_URL = process.env.APP_URL || `http://192.168.86.75:8813/?tower-splash-reward=${Date.now()}`;

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
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) resourceErrors.push({ status: message.params.response.status, url: message.params.response.url });
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
  if (attempt === 29) throw new Error(`Game module did not initialize: ${JSON.stringify(pageErrors)}`);
}

const result = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createTurret, createUnit, createStructure } = await import('/src/sim/world.js');
  const { resolveAttack, applyDamage } = await import('/src/sim/systems/combat.js');
  const { buyRaven } = await import('/src/sim/systems/economy.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  const tower = createTurret('player', 620, CONFIG.GROUND_Y);
  const directTarget = createUnit('warrior', 'ai', 880, CONFIG.GROUND_Y);
  const splashTarget = createUnit('archer', 'ai', 950, CONFIG.GROUND_Y);
  world.structures = [tower];
  world.units = [directTarget, splashTarget];
  resolveAttack(world, tower, directTarget);
  const projectile = world.projectiles[0];
  projectile.elapsed = projectile.duration / 2;
  const enemyTower = createTurret('ai', 1200, CONFIG.GROUND_Y);
  world.structures.push(enemyTower);
  world.teams.player.gold = 0;
  applyDamage(world, enemyTower, enemyTower.hp, 'player');
  const genericStructure = createStructure('ai', 1240, CONFIG.GROUND_Y);
  world.structures.push(genericStructure);
  applyDamage(world, genericStructure, genericStructure.hp, 'player');
  const towerKillGold = world.teams.player.gold;
  const ravenWorld = window.__world;
  ravenWorld.teams.player.gold = CONFIG.RAVEN.cost;
  const ravenPurchase = buyRaven(ravenWorld, 'player');
  window.__camera.zoom = 1;
  window.__camera.x = 300;
  window.__camera.targetX = 300;
  return {
    structureCost: CONFIG.STRUCTURE_COST,
    warrior: { hp: CONFIG.UNIT_STATS.warrior.hp, damage: CONFIG.UNIT_STATS.warrior.damage },
    tower: { hp: tower.maxHp, cost: CONFIG.TURRET_COST, cooldown: tower.attackCooldown, splashRadius: tower.splashRadius, splashDamage: tower.splashDamage },
    projectile: { impact: projectile.impact, elapsed: projectile.elapsed, duration: projectile.duration },
    towerKillGold,
    raven: { cost: CONFIG.RAVEN.cost, purchase: ravenPurchase.ok, active: world.ravens.length },
  };
})()`);

if (result.structureCost !== 450 || JSON.stringify(result.warrior) !== JSON.stringify({ hp: 78.4875, damage: 8.625 })) throw new Error(`Browser Structure/Warrior balance failed: ${JSON.stringify(result)}`);
if (JSON.stringify(result.tower) !== JSON.stringify({ hp: 1260, cost: 2340, cooldown: 2.25, splashRadius: 110, splashDamage: 24 })) throw new Error(`Browser Tower stats failed: ${JSON.stringify(result)}`);
if (JSON.stringify(result.projectile.impact) !== JSON.stringify({ splashRadius: 110, splashDamage: 24, staticDamageMultiplier: 1 })) throw new Error(`Browser Tower impact descriptor failed: ${JSON.stringify(result)}`);
if (result.towerKillGold !== 1170 || !result.raven.purchase || result.raven.cost !== 1200 || result.raven.active !== 1) throw new Error(`Browser Tower reward/Raven purchase failed: ${JSON.stringify(result)}`);

mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
const screenshotPath = join('artifacts', 'screenshots', 'tower-splash-reward-raven-cost-browser.png');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
const unexpectedResources = resourceErrors.filter(({ url }) => !url.endsWith('/favicon.ico'));
const unexpectedLogs = pageErrors.filter((error) => error !== 'Failed to load resource: the server responded with a status of 404 (File not found)');
if (unexpectedResources.length || unexpectedLogs.length) throw new Error(`Browser errors: ${JSON.stringify({ unexpectedResources, unexpectedLogs })}`);
console.log(JSON.stringify({ appUrl: APP_URL, result, screenshotPath, knownFavicon404: resourceErrors.filter(({ url }) => url.endsWith('/favicon.ico')) }, null, 2));
