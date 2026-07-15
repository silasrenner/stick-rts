// Pure fixed-timestep accumulator. No browser globals (window, document,
// requestAnimationFrame, performance.now) — callers supply deltaMs, which
// keeps this reusable from both the browser rAF loop (src/main.js) and a
// future headless Node runner (tools/headless.js).
export function createAccumulator(tickMs) {
  let acc = 0;

  return {
    advance(deltaMs, tickFn) {
      acc += deltaMs;
      while (acc >= tickMs) {
        tickFn(tickMs / 1000);
        acc -= tickMs;
      }
    },
  };
}
