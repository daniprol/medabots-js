import {
  createBattle,
  type BattleSetup,
  type BattleSnapshot,
  type BattleEvent,
  type BattleResult,
  type CommandFrame,
} from '../battle-core';
import { TICKS_PER_SECOND, TICK_DURATION_SECONDS } from '../battle-core/timing';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { InputManager } from '../input/input-manager';
import { aiCommand, createAIState, type AIState } from './ai-controller';

export class LocalBattleSession {
  private readonly battle: ReturnType<typeof createBattle>;
  private readonly input: InputManager;
  private accumulator = 0;
  private aiStates: Record<string, AIState> = {};
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
        .flatMap((team) => team.combatants)
        .map((combatant) => [
          combatant.instanceId,
          assignments[combatant.instanceId] ?? {
            type: 'ai',
            aiProfileId: Object.keys(content.ai)[0]!,
          },
        ]),
    );
    assignments = this.assignments;
    this.battle = createBattle({ setup, content });
    this.previous = this.current = this.battle.getSnapshot();
    this.input = new InputManager(assignments, content);

    for (const [i, combatant] of this.current.combatants.entries()) {
      const assignment = assignments[combatant.id];

      if (!assignment) {
        throw new Error(`Missing controller assignment for ${combatant.id}`);
      }

      if (assignment.type === 'ai') {
        this.aiStates[combatant.id] = createAIState(setup.seed + i * 7919);
      }
    }

    window.addEventListener('blur', this.onBlur);
  }

  private onBlur = () => this.pause('Window lost focus. Resume when you’re ready.');

  advance(deltaSeconds: number) {
    const missing = this.input.poll();

    if (missing.length) {
      this.pause(
        `Controller ${missing.map((i) => i + 1).join(', ')} disconnected. Reconnect it, then resume, or return to setup.`,
      );
    }

    const wantsPause = Object.keys(this.assignments).some((id) => this.input.read(id)?.pause);

    if (wantsPause) {
      if (this.paused && !missing.length) {
        this.resume();
      } else {
        this.pause('Robattle paused.');
      }

      this.input.endTick();
    }

    if (this.paused || this.current.result) {
      this.accumulator = 0;
      this.input.endTick();

      return;
    }

    this.accumulator += Math.min(Math.max(deltaSeconds, 0), 0.1);

    while (this.accumulator >= TICK_DURATION_SECONDS && !this.current.result) {
      const frame = this.createCommandFrame();
      this.previous = this.current;
      this.battle.step(frame);
      this.current = this.battle.getSnapshot();
      this.events.push(...this.battle.drainEvents());
      this.input.endTick();
      this.accumulator -= TICK_DURATION_SECONDS;
    }
  }

  private createCommandFrame(): CommandFrame {
    const frame: CommandFrame = { tick: this.current.tick + 1, commands: {} };

    for (const combatant of this.current.combatants) {
      const assignment = this.assignments[combatant.id]!;
      const command =
        assignment.type === 'ai'
          ? aiCommand(
              this.current,
              combatant.id,
              this.content,
              this.content.ai[assignment.aiProfileId]!,
              this.aiStates[combatant.id]!,
            )
          : this.input.read(combatant.id)!.command;
      const partner = this.current.combatants.find(
        (partner) => partner.teamId === combatant.teamId && partner.role === 'partner',
      );

      if (combatant.role !== 'leader' || !partner || this.assignments[partner.id]?.type !== 'ai') {
        command.strategyPressed = false;
      }

      frame.commands[combatant.id] = command;
    }

    return frame;
  }

  get alpha() {
    return this.accumulator * TICKS_PER_SECOND;
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
    if (this.current.result) {
      return;
    }

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
