import { CONFIG } from '../src/config.js';
import { createTurret, createUnit, createWorld } from '../src/sim/world.js';
import { findAttackTarget } from '../src/sim/systems/supply.js';

function duel(kind) {
  const world = createWorld(31);
  const near = createUnit('warrior', 'ai', 1000, CONFIG.GROUND_Y);
  const far = createUnit('warrior', 'ai', 1060, CONFIG.GROUND_Y);
  const first = createUnit(kind, 'player', 900, CONFIG.GROUND_Y);
  const second = createUnit(kind, 'player', 900, CONFIG.GROUND_Y);
  world.units.push(near, far, first, second);
  first.targetId = findAttackTarget(world, first)?.id ?? null;
  second.targetId = findAttackTarget(world, second)?.id ?? null;
  if (first.targetId !== near.id) throw new Error(`${kind} must retain the nearer first target; got ${first.targetId}`);
  if (second.targetId !== far.id) throw new Error(`${kind} must spread to the comparable unsaturated target; got ${second.targetId}, expected ${far.id}`);
}

duel('warrior');
duel('archer');

// Saturation is deliberately limited to warrior/archer acquisition. A hero
// and turret retain ordinary nearest-target selection even when a warrior is
// already committed to that target.
const world = createWorld(32);
const near = createUnit('warrior', 'ai', 1000, CONFIG.GROUND_Y);
const far = createUnit('warrior', 'ai', 1060, CONFIG.GROUND_Y);
const committedWarrior = createUnit('warrior', 'player', 900, CONFIG.GROUND_Y);
const hero = createUnit('vanguard', 'player', 900, CONFIG.GROUND_Y);
const turret = createTurret('player', 900, CONFIG.GROUND_Y);
world.units.push(near, far, committedWarrior, hero);
world.structures.push(turret);
committedWarrior.targetId = near.id;
if (findAttackTarget(world, hero)?.id !== near.id) throw new Error('Hero target selection must remain unsaturated.');
if (findAttackTarget(world, turret)?.id !== near.id) throw new Error('Turret target selection must remain unsaturated.');

console.log('PASS — warriors and archers distribute across comparable targets while heroes and turrets retain nearest-target behavior.');
