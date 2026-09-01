import { CONFIG } from '../src/config.js';
import { createWorld, createUnit, createStructure } from '../src/sim/world.js';
import { updateCombat } from '../src/sim/systems/combat.js';
import { updateProjectiles } from '../src/sim/systems/projectiles.js';
import { buyTurret, buyUnit, getOccupiedCap, getUnitCount } from '../src/sim/systems/economy.js';
import { getCap } from '../src/sim/systems/supply.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';

const world = createWorld(1);
world.matchState = 'playing';
world.teams.player.gold = 10_000;

const first = buyTurret(world, 'player');
if (!first.ok) throw new Error(`Expected first turret purchase to succeed: ${JSON.stringify(first)}`);
if (world.teams.player.gold !== 10_000 - CONFIG.TURRET_COST) throw new Error(`Turret must deduct ${CONFIG.TURRET_COST} gold; got ${world.teams.player.gold}`);
const queued = world.teams.player.productionQueue[0];
if (queued?.action !== 'turret' || queued.total !== CONFIG.TURRET_BUILD_TIME) throw new Error(`Expected a 20-second turret queue entry: ${JSON.stringify(queued)}`);

updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
const turret = world.structures.find((entity) => entity.isTurret && !entity.isStartingTurret);
if (!turret) throw new Error('Turret did not materialize after its 20-second build time.');
if (turret.x !== CONFIG.PLAYER_HOME_X + CONFIG.TURRET_SLOT_OFFSETS[0]) throw new Error(`Turret used wrong automatic slot: ${turret.x}`);

world.structures.push(createStructure('player', CONFIG.PLAYER_HOME_X + CONFIG.STRUCTURE_SLOT_OFFSETS[0]));
world.teams.player.gold = CONFIG.TURRET_COST * 5;
const second = buyTurret(world, 'player');
if (!second.ok) throw new Error(`Expected second turret purchase to succeed: ${JSON.stringify(second)}`);
const third = buyTurret(world, 'player');
if (!third.ok) throw new Error(`Expected third buildable turret purchase to succeed: ${JSON.stringify(third)}`);
const fourth = buyTurret(world, 'player');
if (!fourth.ok) throw new Error(`Expected fourth buildable turret purchase to succeed: ${JSON.stringify(fourth)}`);
const fifth = buyTurret(world, 'player');
if (fifth.ok || fifth.reason !== 'maxTurrets') throw new Error(`Fifth buildable turret must be rejected: ${JSON.stringify(fifth)}`);

world.teams.player.gold = 10_000;
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
const buildableTurrets = world.structures.filter((entity) => entity.isTurret && !entity.isStartingTurret);
if (buildableTurrets.length !== 4) throw new Error(`Expected four buildable turrets, got ${buildableTurrets.length}.`);
for (const [index, builtTurret] of buildableTurrets.entries()) {
  const expectedX = CONFIG.PLAYER_HOME_X + CONFIG.TURRET_SLOT_OFFSETS[index];
  if (builtTurret.x !== expectedX) throw new Error(`Buildable turret ${index + 1} used wrong automatic slot: ${builtTurret.x}, expected ${expectedX}.`);
}
if (CONFIG.TURRET_SLOT_OFFSETS[2] - CONFIG.TURRET_SLOT_OFFSETS[1] !== CONFIG.TURRET_SLOT_OFFSETS[1] - CONFIG.TURRET_SLOT_OFFSETS[0]) {
  throw new Error(`Third buildable turret must preserve buildable slot spacing: ${JSON.stringify(CONFIG.TURRET_SLOT_OFFSETS)}`);
}
for (let i = 0; i < getCap(world, 'player'); i += 1) {
  const purchase = buyUnit(world, 'player', 'miner');
  if (!purchase.ok) throw new Error(`Population must remain available after buildable turret ${i + 1}: ${JSON.stringify(purchase)}`);
  updateProductionQueue(world, CONFIG.MINER_BUILD_TIME);
}
const capped = buyUnit(world, 'player', 'miner');
if (capped.ok || capped.reason !== 'cap') throw new Error(`Living and queued units must still enforce the cap: ${JSON.stringify(capped)}`);
if (getOccupiedCap(world, 'player') !== getCap(world, 'player') || getUnitCount(world, 'player') !== getOccupiedCap(world, 'player')) throw new Error(`Turrets must reserve zero population while literal unit count reaches cap: ${JSON.stringify({ units: getUnitCount(world, 'player'), occupied: getOccupiedCap(world, 'player'), cap: getCap(world, 'player') })}`);

const target = createUnit('warrior', 'ai', turret.x + 100, CONFIG.GROUND_Y);
target.hp = 200;
target.maxHp = 200;
world.units.push(target);
const hpBeforeShot = target.hp;
updateCombat(world, 1 / CONFIG.TICK_HZ);
for (let i = 0; i < 120 && target.hp === hpBeforeShot; i += 1) updateProjectiles(world, 1 / CONFIG.TICK_HZ);
if (target.hp !== hpBeforeShot - CONFIG.TURRET_DAMAGE) throw new Error(`Turret shot must deal configured ${CONFIG.TURRET_DAMAGE} damage: before=${hpBeforeShot} after=${target.hp}`);
if (turret.x !== CONFIG.PLAYER_HOME_X + CONFIG.TURRET_SLOT_OFFSETS[0]) throw new Error('Turret moved while attacking.');

console.log('PASS — turret cost, queue time, automatic slot, max-three limit, zero population use, and configured stationary-shot damage are correct.');
