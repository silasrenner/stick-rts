import { CONFIG } from '../src/config.js';
import { applyDamage } from '../src/sim/systems/combat.js';
import { updateRegeneration } from '../src/sim/systems/regeneration.js';
import { createStructure, createTurret, createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function advance(world, entity, seconds) {
  world.matchElapsedTime += seconds;
  updateRegeneration(world, seconds);
  return entity.hp;
}

const world = createWorld(401);
world.matchState = 'playing';
world.units = [];
const unit = createUnit('warrior', 'player', 400, CONFIG.GROUND_Y);
const structure = createStructure('player', 450, CONFIG.GROUND_Y);
const turret = createTurret('player', 500, CONFIG.GROUND_Y);
const core = world.statues.player;
world.units.push(unit);
world.structures.push(structure, turret);

for (const entity of [unit, structure, turret, core]) applyDamage(world, entity, entity.maxHp * 0.8, 'ai');
expect(Math.abs(unit.hp - unit.maxHp * 0.2) < 1e-9, 'Damage fixture must create a low-health unit.');
advance(world, unit, 19.999);
expect(Math.abs(unit.hp - unit.maxHp * 0.2) < 1e-9, 'Unit must not regenerate before 20 seconds out of combat.');
advance(world, unit, 0.001);
expect(Math.abs(unit.hp - unit.maxHp * (0.2 + 0.001 / CONFIG.REGEN_FULL_HEAL_SECONDS)) < 1e-9, 'Unit must begin linear regeneration at the exact 20-second boundary.');

applyDamage(world, unit, 1, 'ai');
const afterSecondHit = unit.hp;
advance(world, unit, CONFIG.REGEN_DELAY_SECONDS - 0.001);
expect(unit.hp === afterSecondHit, 'A new hit must reset the unit regeneration delay.');
advance(world, unit, 0.001);
advance(world, unit, CONFIG.REGEN_FULL_HEAL_SECONDS);
expect(unit.hp === unit.maxHp, 'A damaged unit must fully regenerate in 150 seconds and cap at max HP.');

for (const entity of [structure, turret]) {
  entity.hp = entity.maxHp * 0.2;
  entity.lastDamagedAt = world.matchElapsedTime;
  advance(world, entity, CONFIG.REGEN_DELAY_SECONDS + CONFIG.REGEN_FULL_HEAL_SECONDS);
  expect(entity.hp === entity.maxHp, `${entity.isTurret ? 'Turret' : 'Structure'} must regenerate to max HP.`);
}

const coreHp = core.hp;
advance(world, core, CONFIG.REGEN_DELAY_SECONDS + CONFIG.REGEN_FULL_HEAL_SECONDS);
expect(core.hp === coreHp, 'Core/statue must remain excluded from regeneration.');

const dying = createUnit('archer', 'player', 600, CONFIG.GROUND_Y);
world.units.push(dying);
applyDamage(world, dying, dying.maxHp, 'ai');
advance(world, dying, CONFIG.REGEN_DELAY_SECONDS + CONFIG.REGEN_FULL_HEAL_SECONDS);
expect(dying.hp === 0 && dying.state === 'dying', 'Dying units must not regenerate.');

console.log('PASS — regeneration delay, interruption, rate, cap, entity coverage, and exclusions hold.');
