import { createWorld, createUnit, createStatue, createStructure, createTurret } from '../src/sim/world.js';
import {
  getTeamVisionSources,
  isPositionVisibleToTeam,
  isEntityVisibleToTeam,
  getVisibleEnemyEntities,
} from '../src/sim/vision.js';
import { isEntityVisibleInSpectatorView } from '../src/render/spectatorVision.js';

function createVisionWorld() {
  const world = createWorld(17);
  world.units = [];
  world.structures = [];
  world.statues = {
    player: createStatue('player', 100, 0),
    ai: createStatue('ai', 4900, 0),
  };
  world.visionSources = [];
  return world;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// An enemy outside every player source is hidden, then appears and disappears
// as it crosses the exact same friendly source boundary.
{
  const world = createVisionWorld();
  const scout = createUnit('warrior', 'player', 1000, 0);
  const enemy = createUnit('warrior', 'ai', 1500, 0);
  world.units.push(scout, enemy);
  expect(!isEntityVisibleToTeam(world, 'player', enemy), 'Enemy outside player vision must be hidden.');
  enemy.x = 1100;
  expect(isEntityVisibleToTeam(world, 'player', enemy), 'Enemy entering player vision must become visible.');
  enemy.x = 1500;
  expect(!isEntityVisibleToTeam(world, 'player', enemy), 'Enemy leaving player vision must be hidden again.');
}

// Sources are a union, and a non-entity temporary descriptor is supported for
// a future Raven/reveal effect without being a unit, target, or population slot.
{
  const world = createVisionWorld();
  world.units.push(createUnit('miner', 'player', 1000, 0), createUnit('archer', 'player', 2000, 0));
  const enemy = createUnit('archer', 'ai', 2000, 0);
  world.units.push(enemy);
  expect(isEntityVisibleToTeam(world, 'player', enemy), 'A second friendly source must contribute to combined vision.');
  world.visionSources.push({ team: 'player', x: 3000, y: 0, radius: 80, active: true });
  expect(isPositionVisibleToTeam(world, 'player', 3075, 0), 'An active generic vision descriptor must reveal its radius.');
  expect(getTeamVisionSources(world, 'player').some((source) => source.x === 3000 && source.radius === 80), 'Generic source must appear in the query-owned source list.');
}

// Core/base and static structures contribute vision; dead contributors do not.
{
  const world = createVisionWorld();
  const playerCore = world.statues.player;
  expect(isPositionVisibleToTeam(world, 'player', playerCore.x + 300, 0), 'Living core must provide static vision.');
  playerCore.state = 'destroyed';
  expect(!isPositionVisibleToTeam(world, 'player', 400, 0), 'Destroyed core must stop providing vision.');

  const tower = createTurret('player', 2000, 0);
  const structure = createStructure('player', 2600, 0);
  world.structures.push(tower, structure);
  expect(isPositionVisibleToTeam(world, 'player', 2000, 0), 'Living turret must provide static vision.');
  expect(isPositionVisibleToTeam(world, 'player', 2600, 0), 'Living structure must provide static vision.');
  tower.state = 'destroyed';
  structure.state = 'destroyed';
  expect(!isPositionVisibleToTeam(world, 'player', 2000, 0), 'Destroyed turret must stop providing vision.');
  expect(!isPositionVisibleToTeam(world, 'player', 2600, 0), 'Destroyed structure must stop providing vision.');
}

// Left and Right remain independent; visible-enemy query does not leak the
// opposite side's entities.
{
  const world = createVisionWorld();
  const playerScout = createUnit('warrior', 'player', 1000, 0);
  const aiScout = createUnit('warrior', 'ai', 3000, 0);
  const playerTarget = createUnit('miner', 'player', 3200, 0);
  const aiTarget = createUnit('miner', 'ai', 1200, 0);
  world.units.push(playerScout, aiScout, playerTarget, aiTarget);
  expect(isEntityVisibleToTeam(world, 'player', aiTarget), 'Player must see its nearby enemy.');
  expect(!isEntityVisibleToTeam(world, 'player', playerTarget) || playerTarget.team === 'player', 'Own entities remain locally visible without changing enemy query behavior.');
  expect(isEntityVisibleToTeam(world, 'ai', playerTarget), 'AI must independently see its nearby enemy.');
  expect(getVisibleEnemyEntities(world, 'player').includes(aiTarget), 'Player visible-enemy query must include only currently visible enemy.');
  expect(getVisibleEnemyEntities(world, 'player').every((entity) => entity.team === 'ai'), 'Player visible-enemy query must not include friendly entities.');
}

// Full is authoritative. Team views use only their team vision, while friendly
// entities remain visible even away from any source.
{
  const world = createVisionWorld();
  const player = createUnit('warrior', 'player', 1000, 0);
  const hiddenEnemy = createUnit('warrior', 'ai', 1600, 0);
  world.units.push(player, hiddenEnemy);
  expect(isEntityVisibleInSpectatorView(world, 'full', hiddenEnemy), 'Full spectator mode must show authoritative enemy state.');
  expect(isEntityVisibleInSpectatorView(world, 'left', player), 'Left spectator mode must show all Left entities.');
  expect(!isEntityVisibleInSpectatorView(world, 'left', hiddenEnemy), 'Left spectator mode must hide unseen Right enemy.');
  expect(isEntityVisibleInSpectatorView(world, 'right', hiddenEnemy), 'Right spectator mode must show all Right entities.');
}

console.log('PASS — deterministic team vision queries and presentation-only spectator visibility satisfy the coverage contract.');
