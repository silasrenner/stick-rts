import { CONFIG } from '../src/config.js';
import { createWorld, createUnit, createStructure } from '../src/sim/world.js';
import { updateCombat } from '../src/sim/systems/combat.js';
import { updateProjectiles } from '../src/sim/systems/projectiles.js';
import { buyTurret, buyUnit, getOccupiedCap, getUnitCount } from '../src/sim/systems/economy.js';
import { getCap } from '../src/sim/systems/supply.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';

const world = createWorld(1);
world.matchState = 'playing';
world.teams.player.gold = 1_000;

const first = buyTurret(world, 'player');
if (!first.ok) throw new Error(`Expected first turret purchase to succeed: ${JSON.stringify(first)}`);
if (world.teams.player.gold !== 1_000 - CONFIG.TURRET_COST) throw new Error(`Turret must deduct ${CONFIG.TURRET_COST} gold; got ${world.teams.player.gold}`);
const queued = world.teams.player.productionQueue[0];
if (queued?.action !== 'turret' || queued.total !== CONFIG.TURRET_BUILD_TIME) throw new Error(`Expected a 20-second turret queue entry: ${JSON.stringify(queued)}`);

updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
const turret = world.structures.find((entity) => entity.isTurret && !entity.isStartingTurret);
if (!turret) throw new Error('Turret did not materialize after its 20-second build time.');
if (turret.x !== CONFIG.PLAYER_HOME_X + CONFIG.TURRET_SLOT_OFFSETS[0]) throw new Error(`Turret used wrong automatic slot: ${turret.x}`);

world.structures.push(createStructure('player', CONFIG.PLAYER_HOME_X + CONFIG.STRUCTURE_SLOT_OFFSETS[0]));
world.teams.player.gold = CONFIG.TURRET_COST;
const second = buyTurret(world, 'player');
if (!second.ok) throw new Error(`Expected second turret purchase to succeed: ${JSON.stringify(second)}`);
const third = buyTurret(world, 'player');
if (third.ok || third.reason !== 'maxTurrets') throw new Error(`Third turret must be rejected: ${JSON.stringify(third)}`);

world.teams.player.gold = 2_000;
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
for (let i = 0; i < 12; i += 1) {
  const purchase = buyUnit(world, 'player', 'miner');
  if (!purchase.ok) throw new Error(`Expected remaining cap to accept miner ${i + 1}: ${JSON.stringify(purchase)}`);
  updateProductionQueue(world, CONFIG.MINER_BUILD_TIME);
}
const capped = buyUnit(world, 'player', 'miner');
if (capped.ok || capped.reason !== 'cap') throw new Error(`Turrets must consume ${CONFIG.TURRET_POPULATION_COST} cap slots each: ${JSON.stringify(capped)}`);
if (getOccupiedCap(world, 'player') !== getCap(world, 'player') || getUnitCount(world, 'player') === getOccupiedCap(world, 'player')) throw new Error(`Population display must include turret cap use while unit count stays distinct: ${JSON.stringify({ units: getUnitCount(world, 'player'), occupied: getOccupiedCap(world, 'player'), cap: getCap(world, 'player') })}`);

const target = createUnit('warrior', 'ai', turret.x + 100, CONFIG.GROUND_Y);
target.hp = 200;
target.maxHp = 200;
world.units.push(target);
const hpBeforeShot = target.hp;
updateCombat(world, 1 / CONFIG.TICK_HZ);
for (let i = 0; i < 120 && target.hp === hpBeforeShot; i += 1) updateProjectiles(world, 1 / CONFIG.TICK_HZ);
if (target.hp !== hpBeforeShot - CONFIG.TURRET_DAMAGE) throw new Error(`Turret shot must deal doubled 56 damage: before=${hpBeforeShot} after=${target.hp}`);
if (turret.x !== CONFIG.PLAYER_HOME_X + CONFIG.TURRET_SLOT_OFFSETS[0]) throw new Error('Turret moved while attacking.');

console.log('PASS — turret cost, queue time, automatic slot, max-two limit, population use, and doubled 56-damage stationary shot are correct.');
