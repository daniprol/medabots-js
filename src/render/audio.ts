import type { BattleEvent } from '../battle-core';
/** Small original synthesized effects; no sampled game audio. */
export class BattleAudio {
  private context: AudioContext | null = null;
  enabled = true;
  constructor() {
    try {
      this.context = new AudioContext();
    } catch {
      this.enabled = false;
    }
  }
  unlock = () => {
    if (this.context?.state === 'suspended') void this.context.resume();
  };
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.unlock();
    return this.enabled;
  }
  play(events: BattleEvent[]) {
    if (!this.enabled || this.context?.state !== 'running') return;
    let voices = 0;
    for (const e of events) {
      if (voices >= 4) break;
      const sound =
        e.type === 'hit'
          ? ([e.strong ? 95 : 170, 0.075, 'square'] as const)
          : e.type === 'projectileSpawned'
            ? ([620, 0.055, 'sawtooth'] as const)
            : e.type === 'partDestroyed'
              ? ([70, 0.19, 'sawtooth'] as const)
              : e.type === 'specialActivated'
                ? ([220, 0.35, 'sine'] as const)
                : e.type === 'roundEnded'
                  ? ([660, 0.6, 'triangle'] as const)
                  : null;
      if (!sound) continue;
      voices++;
      const [frequency, duration, type] = sound;
      const ctx = this.context;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        e.type === 'specialActivated' ? 880 : frequency * 0.25,
        ctx.currentTime + duration,
      );
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  dispose() {
    if (this.context) void this.context.close();
  }
}
