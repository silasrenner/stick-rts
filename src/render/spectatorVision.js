import { isEntityVisibleToTeam } from '../sim/vision.js';

export const SPECTATOR_VIEWS = ['full', 'left', 'right'];

export function spectatorViewTeam(view) {
  if (view === 'left') return 'player';
  if (view === 'right') return 'ai';
  return null;
}

// Presentation-only adapter. It reads a live simulation query but never writes
// world state; selecting a perspective cannot enter the simulation or AI path.
export function isEntityVisibleInSpectatorView(world, view, entity) {
  const team = spectatorViewTeam(view);
  return team === null || isEntityVisibleToTeam(world, team, entity);
}

// Player-vs-AI intentionally differs from limited Watch views: enemy static
// defenses are known, while enemy mobile activity still needs current player
// vision. Statues use the renderer's known-base silhouette path instead.
export function isEntityVisibleInPlayerView(world, entity) {
  if (entity?.team !== 'ai') return true;
  if (entity.isStructure) return true;
  return isEntityVisibleToTeam(world, 'player', entity);
}
