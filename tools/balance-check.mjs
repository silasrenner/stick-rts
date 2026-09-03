import { CONFIG } from '../src/config.js';

const expected = {
  structureCost: 450,
  ravenCost: 1200,
  turretReward: 1170,
  turret: { cost: 2340, hp: 1260, damage: 42.84, range: 700, cooldown: 2.25, offsets: [700, 1220, 1740, 2260] },
  catapult: { cost: 1050, speed: 90, attackCooldown: 4.5, projectileSpeed: 180, projectileRadius: 9, renderScale: 2.25 },
  archer: { cost: 280, hp: 42, damage: 16, range: 520, acquireRange: 520, cooldown: 1.5 },
  warrior: { cost: 137.5, hp: 78.4875, damage: 8.625 },
};
if (CONFIG.STRUCTURE_COST !== expected.structureCost || CONFIG.RAVEN.cost !== expected.ravenCost || CONFIG.TURRET_KILL_REWARD !== expected.turretReward) throw new Error('Structure, Raven, or Tower-reward balance contract failed');
if (CONFIG.TURRET_COST !== expected.turret.cost || CONFIG.TURRET_HP !== expected.turret.hp || CONFIG.TURRET_DAMAGE !== expected.turret.damage || CONFIG.TURRET_RANGE !== expected.turret.range || CONFIG.TURRET_ATTACK_COOLDOWN !== expected.turret.cooldown || JSON.stringify(CONFIG.TURRET_SLOT_OFFSETS) !== JSON.stringify(expected.turret.offsets)) throw new Error('Turret balance contract failed');
for (const [key, value] of Object.entries(expected.archer)) if (CONFIG.UNIT_STATS.archer[key === 'cooldown' ? 'attackCooldown' : key] !== value) throw new Error(`Archer ${key} failed`);
for (const [key, value] of Object.entries(expected.warrior)) if (CONFIG.UNIT_STATS.warrior[key] !== value) throw new Error(`Warrior ${key} failed`);
for (const [key, value] of Object.entries(expected.catapult)) if (CONFIG.UNIT_STATS.catapult[key] !== value) throw new Error(`Catapult ${key} failed`);
console.log('PASS — requested turret, Catapult, archer, and warrior balance values are configured.');
