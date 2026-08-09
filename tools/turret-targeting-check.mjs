import { createWorld, createUnit, createTurret } from '../src/sim/world.js';
import { findAttackTarget } from '../src/sim/systems/supply.js';

const world = createWorld(27);
const attacker = createUnit('warrior', 'player', 900, 440);
const turret = createTurret('ai', 910, 440);
world.units.push(attacker);
world.structures.push(turret);
const target = findAttackTarget(world, attacker);
if (target?.id !== turret.id) throw new Error(`Attacker should focus an exposed turret when no enemy unit or miner is in range: ${target?.id}`);
console.log('PASS — attackers can target exposed enemy turrets.');
