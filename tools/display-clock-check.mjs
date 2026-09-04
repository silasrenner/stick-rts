import { BASE_SIMULATION_RATE, getDisplayMatchTime, getSimulationTimeScale } from '../src/gameSpeed.js';
import { formatMatchClock } from '../src/render/matchTelemetry.js';

for (const speed of [1, 2, 4]) {
  const simulationElapsed = 125 * getSimulationTimeScale(speed);
  const displayElapsed = getDisplayMatchTime(simulationElapsed);
  if (displayElapsed !== 125 * speed) throw new Error(`${speed}× display clock must advance at ${speed}× real time; got ${displayElapsed}s from ${simulationElapsed}s simulation time.`);
}
if (formatMatchClock(getDisplayMatchTime(125 * BASE_SIMULATION_RATE)) !== '02:05') throw new Error('1× display clock must render a normal 02:05 after 125 real seconds.');
console.log('PASS — display clock is normal at 1× and proportional at 2×/4× without changing simulation time.');
