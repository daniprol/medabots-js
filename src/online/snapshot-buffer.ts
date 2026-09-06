import type { BattleSnapshot } from '../battle-core';

/** A short timeline handles patch jitter without ever extrapolating combat outcomes. */
export class SnapshotBuffer {
  private snapshots: { time: number; snapshot: BattleSnapshot }[] = [];
  private latestAt = 0;
  private lastSampleTime = -Infinity;
  constructor(
    private hz: number,
    private delayMs: number,
    private capacity: number,
  ) {}

  push(snapshot: BattleSnapshot, receivedAt: number) {
    const latest = this.snapshots.at(-1)?.snapshot;
    if (latest && snapshot.tick <= latest.tick) {
      return;
    }
    this.latestAt = receivedAt;
    this.snapshots.push({ time: (snapshot.tick * 1000) / this.hz, snapshot });
    if (this.snapshots.length > this.capacity) {
      this.snapshots.shift();
    }
  }

  sample(now: number) {
    const last = this.snapshots.at(-1);
    if (!last) {
      return null;
    }
    const target = Math.max(
      this.lastSampleTime,
      Math.min(last.time, last.time + Math.max(0, now - this.latestAt) - this.delayMs),
    );
    this.lastSampleTime = target;
    let previous = this.snapshots[0]!;
    for (const current of this.snapshots) {
      if (current.time >= target) {
        const gap = current.time - previous.time;
        return {
          previous: previous.snapshot,
          current: current.snapshot,
          alpha: gap > 0 ? Math.max(0, Math.min(1, (target - previous.time) / gap)) : 1,
        };
      }
      previous = current;
    }
    return { previous: last.snapshot, current: last.snapshot, alpha: 1 };
  }

  clear() {
    this.snapshots = [];
    this.lastSampleTime = -Infinity;
  }
}
