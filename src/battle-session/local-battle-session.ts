import {
  createBattle,
  type BattleSetup,
  type BattleSnapshot,
  type BattleEvent,
  type BattleResult,
  type CommandFrame,
} from '../battle-core';
import type { ContentCatalog } from '../content/build-content-catalog';
import { InputManager } from '../input/input-manager';
import type { Assignments } from '../input/bindings';
import { aiCommand, createAIState, type AIState } from './ai-controller';
export class LocalBattleSession {
  private battle;
  private input;
  private accumulator = 0;
  private memories: Record<string, AIState> = {};
  private events: BattleEvent[] = [];
  previous: BattleSnapshot;
  current: BattleSnapshot;
  paused = false;
  pauseReason = '';
  constructor(
    readonly setup: BattleSetup,
    readonly assignments: Assignments,
    readonly content: ContentCatalog,
  ) {
    this.assignments = Object.fromEntries(
      setup.teams
        .flatMap((t) => t.combatants)
        .map((c) => [
          c.instanceId,
          assignments[c.instanceId] ?? { type: 'ai', aiProfileId: Object.keys(content.ai)[0]! },
        ]),
    );
    assignments = this.assignments;
    this.battle = createBattle({ setup, content });
    this.previous = this.current = this.battle.getSnapshot();
    this.input = new InputManager(assignments, content);
    for (const [i, c] of this.current.combatants.entries()) {
      const assignment = assignments[c.id];
      if (!assignment) throw new Error(`Missing controller assignment for ${c.id}`);
      if (assignment.type === 'ai') this.memories[c.id] = createAIState(setup.seed + i * 7919);
    }
    window.addEventListener('blur', this.onBlur);
  }
  private onBlur = () => this.pause('Window lost focus. Resume when you’re ready.');
  advance(deltaSeconds: number) {
    const missing = this.input.poll();
    if (missing.length)
      this.pause(
        `Controller ${missing.map((i) => i + 1).join(', ')} disconnected. Reconnect it, then resume, or return to setup.`,
      );
    const wantsPause = Object.keys(this.assignments).some((id) => this.input.read(id)?.pause);
    if (wantsPause) {
      if (this.paused && !missing.length) this.resume();
      else this.pause('Robattle paused.');
      this.input.endTick();
    }
    if (this.paused || this.current.result) {
      this.accumulator = 0;
      this.input.endTick();
      return;
    }
    this.accumulator += Math.min(Math.max(deltaSeconds, 0), 0.1);
    while (this.accumulator >= 1 / 60 && !this.current.result) {
      const frame: CommandFrame = { tick: this.current.tick + 1, commands: {} };
      for (const c of this.current.combatants) {
        const assignment = this.assignments[c.id]!;
        const command =
          assignment.type === 'ai'
            ? aiCommand(
                this.current,
                c.id,
                this.content,
                this.content.ai[assignment.aiProfileId]!,
                this.memories[c.id]!,
              )
            : this.input.read(c.id)!.command;
        const partner = this.current.combatants.find(
          (p) => p.teamId === c.teamId && p.role === 'partner',
        );
        if (c.role !== 'leader' || !partner || this.assignments[partner.id]?.type !== 'ai')
          command.strategyPressed = false;
        frame.commands[c.id] = command;
      }
      this.previous = this.current;
      this.battle.step(frame);
      this.current = this.battle.getSnapshot();
      this.events.push(...this.battle.drainEvents());
      this.input.endTick();
      this.accumulator -= 1 / 60;
    }
  }
  get alpha() {
    return this.accumulator * 60;
  }
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
  getSnapshot() {
    return structuredClone(this.current);
  }
  getResult(): BattleResult | null {
    return this.battle.getResult();
  }
  pause(reason = 'Robattle paused.') {
    if (this.current.result) return;
    this.paused = true;
    this.pauseReason = reason;
    this.input.clear();
    this.accumulator = 0;
  }
  resume() {
    const missing = this.input.poll();
    if (missing.length) {
      this.pause(
        `Controller ${missing.map((i) => i + 1).join(', ')} is still disconnected. Reconnect it or return to setup.`,
      );
      return;
    }
    this.paused = false;
    this.pauseReason = '';
    this.input.clear();
    this.accumulator = 0;
  }
  dispose() {
    this.input.dispose();
    window.removeEventListener('blur', this.onBlur);
  }
}
