// 1× is intentionally the former 5× wall-clock simulation pace. UI labels
// remain player-facing multipliers while this helper owns the real-rate mapping.
export const GAME_SPEEDS = [1, 2, 4];
export const DEFAULT_GAME_SPEED = 1;
export const BASE_SIMULATION_RATE = 5;

export function getSimulationTimeScale(speed) {
  return speed * BASE_SIMULATION_RATE;
}

// Simulation time remains authoritative for rules; this is presentation-only
// wall-clock time for the player-facing match clock, result, and chart axis.
export function getDisplayMatchTime(simulationSeconds) {
  return simulationSeconds / BASE_SIMULATION_RATE;
}
