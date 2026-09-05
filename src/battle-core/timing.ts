/** Shared by content normalization, the fixed-step session and the authoritative rules. */
export const TICKS_PER_SECOND = 60;

export const TICK_DURATION_SECONDS = 1 / TICKS_PER_SECOND;

export function millisecondsToTicks(milliseconds: number): number {
  return Math.ceil((milliseconds * TICKS_PER_SECOND) / 1000);
}
