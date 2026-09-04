import { DEFAULT_GAME_SPEED, GAME_SPEEDS, getSimulationTimeScale } from '../src/gameSpeed.js';

const expected = [1, 2, 4];
if (DEFAULT_GAME_SPEED !== 1) throw new Error(`New matches must default to 1×; got ${DEFAULT_GAME_SPEED}×.`);
if (GAME_SPEEDS.join(',') !== expected.join(',')) throw new Error(`Speed selector must offer exactly 1×, 2×, 4×; got ${GAME_SPEEDS.join(',')}.`);
for (const [label, oldActualRate] of [[1, 5], [2, 10], [4, 20]]) {
  const actualRate = getSimulationTimeScale(label);
  if (actualRate !== oldActualRate) throw new Error(`${label}× must advance at the former ${oldActualRate}× rate; got ${actualRate}×.`);
}
console.log('PASS — 1×/2×/4× labels map to the former 5×/10×/20× simulation rates.');
