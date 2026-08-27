import { CONFIG } from '../src/config.js';

const expected = {
  turret: { cost: 600, hp: 450, damage: 56, range: 560, population: 8, cooldown: 1.8, offsets: [380, 900] },
  archer: { cost: 280, hp: 42, damage: 16, range: 520, acquireRange: 520, cooldown: 1.5 },
  warrior: { cost: 137.5, hp: 54.6, damage: 7.5 },
};
if (CONFIG.TURRET_COST !== expected.turret.cost || CONFIG.TURRET_HP !== expected.turret.hp || CONFIG.TURRET_DAMAGE !== expected.turret.damage || CONFIG.TURRET_RANGE !== expected.turret.range || CONFIG.TURRET_POPULATION_COST !== expected.turret.population || CONFIG.TURRET_ATTACK_COOLDOWN !== expected.turret.cooldown || JSON.stringify(CONFIG.TURRET_SLOT_OFFSETS) !== JSON.stringify(expected.turret.offsets)) throw new Error('Turret balance contract failed');
for (const [key, value] of Object.entries(expected.archer)) if (CONFIG.UNIT_STATS.archer[key === 'cooldown' ? 'attackCooldown' : key] !== value) throw new Error(`Archer ${key} failed`);
for (const [key, value] of Object.entries(expected.warrior)) if (CONFIG.UNIT_STATS.warrior[key] !== value) throw new Error(`Warrior ${key} failed`);
console.log('PASS — requested turret, archer, and warrior balance values are configured.');
