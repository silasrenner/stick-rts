import { CONFIG } from '../src/config.js';
import { createTurret, createUnit, createWorld } from '../src/sim/world.js';
import { applyDamage } from '../src/sim/systems/combat.js';
import { buyStructure } from '../src/sim/systems/economy.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(CONFIG.STRUCTURE_COST === 450, `Structure cost must be 450g after the approved 50% increase; got ${CONFIG.STRUCTURE_COST}.`);
expect(CONFIG.TURRET_KILL_REWARD === 1170, `Tower kill reward must be 1170g (50% of its 2340g cost); got ${CONFIG.TURRET_KILL_REWARD}.`);
expect(CONFIG.UNIT_STATS.warrior.hp === 78.4875, `Warrior HP must be 78.4875 after the approved 25% increase; got ${CONFIG.UNIT_STATS.warrior.hp}.`);
expect(CONFIG.UNIT_STATS.warrior.damage === 8.625, `Warrior damage must be 8.625 after the approved 15% increase; got ${CONFIG.UNIT_STATS.warrior.damage}.`);

const world = createWorld(560);
world.matchState = 'playing';
world.teams.player.gold = CONFIG.STRUCTURE_COST;
const structurePurchase = buyStructure(world, 'player');
expect(structurePurchase.ok && world.teams.player.gold === 0, `A funded structure purchase must deduct exactly 450g: ${JSON.stringify({ structurePurchase, gold: world.teams.player.gold })}.`);

const warrior = createUnit('warrior', 'player', 200, CONFIG.GROUND_Y);
expect(warrior.hp === 78.4875 && warrior.maxHp === 78.4875 && warrior.damage === 8.625, `Materialized Warriors must inherit only the approved HP/damage values: ${JSON.stringify({ hp: warrior.hp, maxHp: warrior.maxHp, damage: warrior.damage, speed: warrior.speed, range: warrior.range, attackCooldown: warrior.attackCooldown })}.`);

const enemyTower = createTurret('ai', 800, CONFIG.GROUND_Y);
world.structures.push(enemyTower);
world.teams.player.gold = 0;
applyDamage(world, enemyTower, enemyTower.hp, 'player');
expect(world.teams.player.gold === 1170, `Destroying an enemy Tower must award the approved 1170g reward; got ${world.teams.player.gold}.`);

console.log('PASS — Structure price, Tower bounty, and Warrior HP/damage meet the approved balance contract.');
