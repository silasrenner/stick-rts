const ARROW_KEYS = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown']);

// Continuous held-key tracking — the abstraction S2's keyboard.js
// deferred until hero direct-control actually needed it. Unlike
// bindDebugKeys (fires once per press), this answers "is this key down
// right now," sampled once per sim tick.
export function createKeyState() {
  const held = new Set();

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (ARROW_KEYS.has(key)) event.preventDefault(); // don't let the page scroll
    held.add(key);
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.key.toLowerCase());
  });

  return {
    isDown: (key) => held.has(key.toLowerCase()),
  };
}
