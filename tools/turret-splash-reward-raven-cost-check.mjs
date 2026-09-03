import { CONFIG } from '../src/config.js';
import { createStructure, createTurret, createUnit, createWorld } from '../src/sim/world.js';
import { resolveAttack, applyDamage } from '../src/sim/systems/combat.js';
import { updateProjectiles } from '../src/sim/systems/projectiles.js';
import { buyRaven } from '../src/sim/systems/economy.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(CONFIG.TURRET_HP === 1260, `Tower HP must be 1260 after the approved 40% increase; got ${CONFIG.TURRET_HP}.`);
expect(CONFIG.TURRET_COST === 2340, `Tower cost must be 2340g after the approved 50% increase; got ${CONFIG.TURRET_COST}.`);
expect(CONFIG.TURRET_ATTACK_COOLDOWN === 2.25, `Tower cooldown must be 2.25s after the approved 25% slowdown; got ${CONFIG.TURRET_ATTACK_COOLDOWN}.`);
expect(CONFIG.RAVEN.cost === 1200, `Raven cost must be 1200g after the approved 60% increase; got ${CONFIG.RAVEN.cost}.`);
expect(CONFIG.TURRET_SPLASH_RADIUS === 110 && CONFIG.TURRET_SPLASH_DAMAGE === 24, `Tower splash must be Catapult-equivalent 110px/24 damage; got ${JSON.stringify({ radius: CONFIG.TURRET_SPLASH_RADIUS, damage: CONFIG.TURRET_SPLASH_DAMAGE })}.`);
expect(CONFIG.TURRET_KILL_REWARD === 1170, `Tower kill reward must be 1170g (50% of the 2340g Tower cost); got ${CONFIG.TURRET_KILL_REWARD}.`);

const world = createWorld(550);
world.matchState = 'playing';
const tower = createTurret('player', 500, CONFIG.GROUND_Y);
const target = createUnit('warrior', 'ai', 600, CONFIG.GROUND_Y);
const splashVictim = createUnit('archer', 'ai', 670, CONFIG.GROUND_Y);
world.structures = [tower];
world.units = [target, splashVictim];
const targetBefore = target.hp;
const splashBefore = splashVictim.hp;
resolveAttack(world, tower, target);
expect(world.projectiles.length === 1, 'Tower must fire one projectile.');
for (let i = 0; i < 120 && world.projectiles.length > 0; i += 1) updateProjectiles(world, 1 / CONFIG.TICK_HZ);
expect(target.hp === targetBefore - CONFIG.TURRET_DAMAGE, `Tower direct hit must retain configured direct damage; got ${targetBefore - target.hp}.`);
expect(splashVictim.hp === splashBefore - CONFIG.TURRET_SPLASH_DAMAGE, `Tower projectile must apply configured splash to nearby enemy units; got ${splashBefore - splashVictim.hp}.`);

const structure = createStructure('ai', 700, CONFIG.GROUND_Y);
world.structures.push(structure);
const structureBefore = structure.hp;
resolveAttack(world, tower, structure);
for (let i = 0; i < 120 && world.projectiles.length > 0; i += 1) updateProjectiles(world, 1 / CONFIG.TICK_HZ);
expect(structure.hp === structureBefore - CONFIG.TURRET_DAMAGE, `Tower static direct damage must not inherit Catapult's multiplier; got ${structureBefore - structure.hp}.`);

const enemyTower = createTurret('ai', 800, CONFIG.GROUND_Y);
world.structures.push(enemyTower);
world.teams.player.gold = 0;
applyDamage(world, enemyTower, enemyTower.hp, 'player');
expect(world.teams.player.gold === CONFIG.TURRET_KILL_REWARD, `Destroying a Tower must award exactly ${CONFIG.TURRET_KILL_REWARD}g; got ${world.teams.player.gold}.`);
const genericStructure = createStructure('ai', 850, CONFIG.GROUND_Y);
world.structures.push(genericStructure);
applyDamage(world, genericStructure, genericStructure.hp, 'player');
expect(world.teams.player.gold === CONFIG.TURRET_KILL_REWARD, 'Generic supply structures must remain reward-free.');

const ravenWorld = createWorld(551);
ravenWorld.matchState = 'playing';
ravenWorld.teams.player.gold = CONFIG.RAVEN.cost;
const ravenPurchase = buyRaven(ravenWorld, 'player');
expect(ravenPurchase.ok && ravenWorld.teams.player.gold === 0, `A funded Raven purchase must deduct its new exact price: ${JSON.stringify({ ravenPurchase, gold: ravenWorld.teams.player.gold })}.`);

console.log('PASS — Towers use the approved durability/cost/cadence, bounded splash, ordinary static damage, and kill reward; Raven uses the approved price.');
