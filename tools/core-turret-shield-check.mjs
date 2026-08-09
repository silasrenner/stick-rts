import { createWorld, createUnit } from '../src/sim/world.js';
import { findAttackTarget } from '../src/sim/systems/supply.js';

const world = createWorld(93);
const attacker = createUnit('warrior', 'ai', 300, 440);
const miner = createUnit('miner', 'player', 60, 440);
world.units.push(attacker, miner);
const coreTurret = world.structures.find((entity) => entity.team === 'player' && entity.isStartingTurret);
if (findAttackTarget(world, attacker)?.id !== coreTurret.id) throw new Error('Core turret must shield nearby miners while it lives.');
coreTurret.state = 'destroyed';
if (findAttackTarget(world, attacker)?.id !== miner.id) throw new Error('Miner should become targetable after the core turret is destroyed.');
console.log('PASS — core turret shields retreating miners until destroyed.');
