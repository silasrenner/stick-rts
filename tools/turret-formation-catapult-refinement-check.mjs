import { CONFIG } from '../src/config.js';
import { createStructure, createTurret, createUnit, createWorld } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { resolveAttack } from '../src/sim/systems/combat.js';
import { findAttackTarget } from '../src/sim/systems/supply.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const catapult = CONFIG.UNIT_STATS.catapult;
expect(JSON.stringify(CONFIG.TURRET_SLOT_OFFSETS) === JSON.stringify([700, 1220, 1740, 2260]), `Buildable turret offsets must move beyond miner deposits while retaining 520px spacing; got ${JSON.stringify(CONFIG.TURRET_SLOT_OFFSETS)}.`);
expect(catapult.cost === 1050, `Catapult cost must be 1050 after the approved 50% increase; got ${catapult.cost}.`);
expect(catapult.speed === 90, `Catapult speed must match the main army at 90; got ${catapult.speed}.`);
expect(catapult.attackCooldown === 4.5, `Catapult firing cooldown must be 4.5s; got ${catapult.attackCooldown}.`);
expect(catapult.projectileSpeed === 180, `Catapult projectile speed must be 180px/s; got ${catapult.projectileSpeed}.`);
expect(catapult.projectileRadius === 9, `Catapult projectile radius must remain 9px; got ${catapult.projectileRadius}.`);
expect(catapult.renderScale === 2.25, `Catapult render scale must be 2.25× after the approved 25% reduction; got ${catapult.renderScale}.`);

for (const team of ['player', 'ai']) {
  const sign = team === 'player' ? 1 : -1;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const world = createWorld(903);
  world.matchState = 'playing';
  for (const offset of CONFIG.TURRET_SLOT_OFFSETS) world.structures.push(createTurret(team, homeX + sign * offset, CONFIG.GROUND_Y));
  const warrior = createUnit('warrior', team, homeX, CONFIG.GROUND_Y);
  const archer = createUnit('archer', team, homeX, CONFIG.GROUND_Y);
  const siege = createUnit('catapult', team, homeX, CONFIG.GROUND_Y);
  world.units.push(warrior, archer, siege);

  world.teams[team].defendAnchorIndex = 0;
  updateFormationSlots(world);
  const firstTurretX = homeX + sign * CONFIG.TURRET_SLOT_OFFSETS[0];
  expect([warrior, archer, siege].every((unit) => sign * (unit.slotX - firstTurretX) > 0), `${team} first-built-turret defense must place every troop line ahead of the turret.`);
  expect(sign * siege.slotX > sign * warrior.slotX && sign * warrior.slotX > sign * archer.slotX, `${team} first-turret defense must retain Catapult → Warrior → Archer order.`);

  world.teams[team].defendAnchorIndex = 1;
  updateFormationSlots(world);
  const laterTurretX = homeX + sign * CONFIG.TURRET_SLOT_OFFSETS[1];
  expect([warrior, archer, siege].every((unit) => sign * (unit.slotX - laterTurretX) < 0), `${team} later-built-turret defense must place every troop line behind the turret.`);
  expect(sign * siege.slotX > sign * warrior.slotX && sign * warrior.slotX > sign * archer.slotX, `${team} later-turret defense must retain Catapult → Warrior → Archer order.`);
}

for (const kind of ['turret', 'structure', 'core']) {
  const world = createWorld(904);
  world.matchState = 'playing';
  const siege = createUnit('catapult', 'player', 500, CONFIG.GROUND_Y);
  const mobile = createUnit('warrior', 'ai', 650, CONFIG.GROUND_Y);
  world.units.push(siege, mobile);
  let staticTarget;
  if (kind === 'turret') {
    staticTarget = createTurret('ai', 900, CONFIG.GROUND_Y);
    world.structures.push(staticTarget);
  } else if (kind === 'structure') {
    staticTarget = createStructure('ai', 900, CONFIG.GROUND_Y);
    world.structures.push(staticTarget);
  } else {
    staticTarget = world.statues.ai;
    staticTarget.x = 900;
  }
  expect(findAttackTarget(world, siege)?.id === staticTarget.id, `Catapult must prioritize an in-range ${kind} over an enemy combat unit.`);
  resolveAttack(world, siege, staticTarget);
  const projectile = world.projectiles.at(-1);
  expect(projectile?.radius === 9 && projectile.duration === Math.abs(staticTarget.x - siege.x) / 180, `Catapult must retain its 9px projectile while using the approved faster travel speed for ${kind}: ${JSON.stringify(projectile)}.`);
}

console.log('PASS — buildable turrets clear miner traffic, defend formations switch sides by built-turret ordinal, and Catapult stats/static targeting/projectiles meet the approved contract.');
