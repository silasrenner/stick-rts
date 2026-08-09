import { createWorld, createUnit } from '../src/sim/world.js';
import { applyDamage } from '../src/sim/systems/combat.js';

const world = createWorld(101);
const victim = createUnit('archer', 'ai', 500, 440);
world.units.push(victim);
const before = world.teams.player.gold;
applyDamage(world, victim, victim.hp, 'player');
const expected = Math.round(victim.goldValue * 0.10);
if (world.teams.player.gold !== before + expected) throw new Error(`Expected ${expected} gold unit-kill reward; got ${world.teams.player.gold - before}`);
if (victim.state !== 'dying') throw new Error('Killed unit did not enter dying state.');
console.log('PASS — unit kills grant the killer team 10% of the defeated unit value.');
