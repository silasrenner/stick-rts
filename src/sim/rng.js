// Seeded, deterministic PRNG (mulberry32) — the only sanctioned source of
// randomness in the sim. No crypto: reproducibility across runs matters
// more than unpredictability here.
export function createRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextRange(min, max) {
      return min + this.next() * (max - min);
    },
  };
}
