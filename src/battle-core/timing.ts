/** Shared by content normalization, the fixed-step session and the authoritative rules. */
export const TICKS_PER_SECOND = 60;

/** One GBA video frame: 280896 CPU cycles at 16777216 Hz (59.7275 Hz). */
export const TICK_DURATION_SECONDS = 280896 / 16777216;

export function millisecondsToTicks(milliseconds: number): number {
  return Math.ceil((milliseconds * TICKS_PER_SECOND) / 1000);
}
