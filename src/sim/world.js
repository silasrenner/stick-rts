let nextId = 1;

export function createWorld() {
  return {
    units: [],
  };
}

export function createUnit(kind, team, x, y) {
  return {
    id: nextId++,
    kind,
    team,
    x,
    y,
    vx: 0,
    facing: 1,
    state: 'idle',
    animPhase: 0,
    pauseTimer: 0,
  };
}
