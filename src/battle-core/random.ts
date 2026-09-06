import type { BattleContext } from './types';

/** Numerical Recipes LCG: identical unsigned 32-bit transitions in JS runtimes. */
export function nextRandom(seed: number): { state: number; value: number } {
  const state = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

  return { state, value: state / 4294967296 };
}

/** AX consumes a bounded byte stream. The snapshot carries the authoritative cursor. */
export function battleRandom(context: BattleContext): number {
  const value =
    context.content.rules[context.setup.rulesId]!.original.battleRandom[
      context.state.randomCursor
    ]!;
  context.state.randomCursor = (context.state.randomCursor + 1) & 255;
  return value;
}
