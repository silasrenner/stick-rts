import { createRaven, createStructure, createTurret, createUnit, createWorld } from '../src/sim/world.js';
import { isEntityVisibleInPlayerView } from '../src/render/spectatorVision.js';
import { isPositionVisibleToTeam } from '../src/sim/vision.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const world = createWorld(402);
world.units = [];
world.structures = [];
const playerScout = createUnit('warrior', 'player', 1000, 0);
const hiddenEnemy = createUnit('warrior', 'ai', 1600, 0);
const enemyStructure = createStructure('ai', 3000, 0);
const enemyTurret = createTurret('ai', 3200, 0);
const enemyRaven = createRaven('ai');
enemyRaven.x = 1600;
enemyRaven.y = 0;
world.units.push(playerScout, hiddenEnemy);
world.structures.push(enemyStructure, enemyTurret);

expect(!isEntityVisibleInPlayerView(world, hiddenEnemy), 'Player view must hide enemy mobile units outside current vision.');
expect(isEntityVisibleInPlayerView(world, enemyStructure), 'Player view must retain enemy structures outside current vision.');
expect(isEntityVisibleInPlayerView(world, enemyTurret), 'Player view must retain enemy turrets outside current vision.');
expect(!isEntityVisibleInPlayerView(world, enemyRaven), 'Player view must hide enemy Ravens outside current vision.');
expect(!isPositionVisibleToTeam(world, 'player', 1600, 0), 'Enemy projectile position fixture must begin outside player vision.');

hiddenEnemy.x = 1100;
enemyRaven.x = 1100;
expect(isEntityVisibleInPlayerView(world, hiddenEnemy), 'Player view must reveal an enemy mobile unit inside current player vision.');
expect(isEntityVisibleInPlayerView(world, enemyRaven), 'Player view must reveal an enemy Raven inside current player vision.');
expect(isPositionVisibleToTeam(world, 'player', 1100, 0), 'Current player vision must reveal projectile positions within the same shared radius.');

console.log('PASS — Player-vs-AI fog hides mobile enemies/Ravens/projectiles while retaining static enemy defenses.');
