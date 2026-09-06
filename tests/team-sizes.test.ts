import { describe, expect, it } from 'vitest';

import { createBattle } from '../src/battle-core';
import { aiCommand, createAIState } from '../src/battle-session/ai-controller';
import { assignmentsForSetup, presetAssignments, resizeTeams } from '../src/ui/setup-state';
import { content, fixture, frame, setup } from './helpers';

describe('configurable battle sizes', () => {
  it.each([1, 2, 3] as const)(
    '%i per team instantiates, attacks and finishes a timeout',
    (size) => {
      const battleSetup = resizeTeams(setup, size, content);
      const shortContent = fixture((definition) => {
        if (definition.kind === 'rules') {
          definition.roundTimeMs = 15000;
        }
      });
      const battle = createBattle({ setup: battleSetup, content: shortContent });
      const actors = battle.getSnapshot().combatants;
      expect(new Set(actors.map((actor) => actor.actorIndex)).size).toBe(size * 2);
      const attacks = new Set<string>();
      for (let tick = 1; tick <= 900; tick++) {
        const commands = Object.fromEntries(
          actors.map((actor) => [
            actor.id,
            { rightArmPressed: tick % 30 === 0, strategyPressed: tick === 1 },
          ]),
        );
        battle.step(frame(tick, commands, battleSetup));
        for (const event of battle.drainEvents()) {
          if (event.type === 'attackStarted') {
            attacks.add(event.combatantId);
          }
        }
      }
      expect(attacks).toEqual(new Set(actors.map((actor) => actor.id)));
      expect(battle.getResult()).not.toBeNull();
      expect(battle.getResult()!.finalCombatants).toHaveLength(size * 2);
      expect(JSON.parse(JSON.stringify(battle.getSnapshot()))).toEqual(battle.getSnapshot());
    },
  );

  it('shrinking removes inactive controller assignments; expansion defaults added slots to AI', () => {
    const expanded = resizeTeams(setup, 3, content);
    const assigned = assignmentsForSetup(expanded, presetAssignments('shared-two'));
    expect(Object.keys(assigned)).toHaveLength(6);
    expect(assigned.A3).toEqual({ type: 'ai', aiProfileId: 'ai-balanced' });
    assigned.A2 = { type: 'gamepad', gamepadIndex: 0, profileId: 'standard-gamepad' };
    const duel = assignmentsForSetup(resizeTeams(expanded, 1, content), assigned);
    expect(Object.keys(duel).sort()).toEqual(['A1', 'B1']);
    expect(presetAssignments('shared-three', [], ['A1', 'B1'])).toEqual(duel);
    expect(setup.teams[0]!.combatants).toHaveLength(2);
  });

  it('rejects unequal teams through both the content catalog and core boundary', () => {
    expect(() =>
      fixture((definition) => {
        if (definition.kind === 'match') {
          definition.teams[0]!.combatants.pop();
        }
      }),
    ).toThrow(/equally sized/);
    const unequal = structuredClone(setup);
    unequal.teams[0]!.combatants.pop();
    expect(() => createBattle({ content, setup: unequal })).toThrow(/same one-to-three/);
  });

  it('difficulty changes decisions without changing armor or damage', () => {
    const snapshot = createBattle({ content, setup }).getSnapshot();
    const actor = snapshot.combatants[0]!;
    snapshot.tick = 1;
    const easy = aiCommand(snapshot, actor.id, content, content.ai['ai-easy']!, createAIState(1));
    const normal = aiCommand(
      snapshot,
      actor.id,
      content,
      content.ai['ai-balanced']!,
      createAIState(1),
    );
    expect(easy.moveX).toBe(0);
    expect(normal.moveX).toBe(1);
    expect(content.ai['ai-easy']!.attackDelayTicks).toBeGreaterThan(
      content.ai['ai-balanced']!.attackDelayTicks,
    );
    expect(content.ai['ai-aggressive']!.variant).toBeGreaterThan(
      content.ai['ai-balanced']!.variant,
    );
    expect(snapshot).toEqual({ ...createBattle({ content, setup }).getSnapshot(), tick: 1 });
  });
});
