/** Numerical Recipes LCG: identical unsigned 32-bit transitions in JS runtimes. */
export function nextRandom(seed: number): { state: number; value: number } {
  const state = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { state, value: state / 4294967296 };
}
