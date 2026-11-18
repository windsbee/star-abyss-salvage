// random.js — a tiny seeded RNG (mulberry32) plus the small helpers the game
// uses everywhere. One instance lives on the game state so a run is repeatable
// when it is seeded, and wild when it is seeded from the clock.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
    // A random element of a non-empty array.
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
  };
}
