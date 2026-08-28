import { isMineVisibleToViewer } from '../src/render/renderer.js';
import { createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const world = createWorld(612);
const playerMine = world.mines.player.deposits[1];
const aiMine = world.mines.ai.deposits[1];
expect(isMineVisibleToViewer(world, 'player', 'player', playerMine), 'Player mine markers must remain visible in the player view even while miners occupy them.');
expect(!isMineVisibleToViewer(world, 'player', 'ai', aiMine), 'Enemy mine markers must remain hidden outside Player vision.');
expect(isMineVisibleToViewer(world, null, 'ai', aiMine), 'Full Watch view must retain all mine markers.');

console.log('PASS — mine-marker visibility respects player fog while preserving own and full-view markers.');
