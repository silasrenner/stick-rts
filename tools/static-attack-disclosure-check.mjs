import { createStructure, createTurret, createUnit, createWorld } from '../src/sim/world.js';
import {
  getPlayerAttackTargetRevealSources,
  isEntityVisibleInPlayerView,
  isPlayerStaticHealthVisible,
} from '../src/render/spectatorVision.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const world = createWorld(831);
world.units = [];
world.structures = [];

const enemyCore = world.statues.ai;
enemyCore.x = 3000;
const enemyStructure = createStructure('ai', 3400, 0);
const enemyTurret = createTurret('ai', 3800, 0);
const playerArcher = createUnit('archer', 'player', 2500, 0);
world.units.push(playerArcher);
world.structures.push(enemyStructure, enemyTurret);

for (const target of [enemyCore, enemyStructure, enemyTurret]) {
  expect(!isEntityVisibleInPlayerView(world, target), `${target.id} must begin outside ordinary Player vision.`);
  expect(!isPlayerStaticHealthVisible(world, target), `${target.id} must not expose a health bar while hidden and unattacked.`);

  playerArcher.targetId = target.id;
  const sources = getPlayerAttackTargetRevealSources(world);
  expect(sources.length === 1 && sources[0].entityId === target.id, `${target.id} must contribute its ordinary vision-radius disclosure source while a Player unit targets it.`);
  expect(isPlayerStaticHealthVisible(world, target), `${target.id} must expose its health bar while Player attack-target disclosure is active.`);

  playerArcher.targetId = null;
  expect(!isPlayerStaticHealthVisible(world, target), `${target.id} must hide its health bar once Player attack-target disclosure ends.`);
}

console.log('PASS — Player-targeted enemy core, structure, and turret disclosure exposes health only while currently revealed.');
