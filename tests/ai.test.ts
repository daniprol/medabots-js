import { describe, expect, it } from 'vitest';

import { createBattle, type BattleSetup, type CommandFrame } from '../src/battle-core';
import { aiCommand, createAIState } from '../src/battle-session/ai-controller';
import { chooseAIAction } from '../src/battle-session/ai-weapons';
import { content, setup } from './helpers';

function scenario(characterIds: string[], arenaId = setup.arenaId): BattleSetup {
  let index = 0;
  return {
    ...structuredClone(setup),
    arenaId,
    teams: setup.teams.map((team) => ({
      ...team,
      combatants: team.combatants.map((actor) => ({
        ...actor,
        characterId: characterIds[index++ % characterIds.length]!,
      })),
    })),
  };
}

describe('source-informed AI', () => {
  it('conserves three-use head ammunition until 30, 60, and 90 seconds', () => {
    const snapshot = createBattle({ content, setup }).getSnapshot();
    const actor = snapshot.combatants[0]!;
    const target = snapshot.combatants[1]!;
    target.x = actor.x + 2;
    target.y = actor.y;
    actor.parts.rightArm.definitionId = 'gorem-2-right-arm';
    actor.parts.leftArm.definitionId = 'gorem-2-left-arm';
    for (let uses = 0; uses < 3; uses++) {
      actor.parts.head.uses = uses;
      const threshold = (uses + 1) * 1800;
      snapshot.remainingTicks = content.rules[setup.rulesId]!.roundTicks - threshold + 1;
      expect(
        chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0),
      ).toBeNull();
      snapshot.remainingTicks--;
      expect(chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0)).toBe(
        'head',
      );
    }
  });

  it('healers choose recovery for injured teammates and revival only for destroyed limbs', () => {
    const snapshot = createBattle({
      content,
      setup: scenario(['neutranurse', 'metabee']),
    }).getSnapshot();
    const actor = snapshot.combatants[0]!;
    const target = snapshot.combatants.find((other) => other.teamId !== actor.teamId)!;
    const friend = snapshot.combatants.find(
      (other) => other.teamId === actor.teamId && other.id !== actor.id,
    )!;
    actor.panel = 1;
    expect(chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0)).toBeNull();
    friend.parts.rightArm.currentArmor = 1;
    expect(chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0)).toBe(
      'rightArm',
    );
    actor.parts.head.definitionId = 'belzelga-head';
    actor.panel = 3;
    expect(chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0)).toBeNull();
    friend.parts.rightArm.currentArmor = 0;
    friend.parts.rightArm.destroyed = true;
    expect(chooseAIAction(snapshot, actor, target, content, createAIState(1), () => 0)).toBe(
      'head',
    );
  });

  it('jumps toward higher opponents and cannot act after knockout', () => {
    const snapshot = createBattle({ content, setup }).getSnapshot();
    const actor = snapshot.combatants[0]!;
    for (const enemy of snapshot.combatants.filter((other) => other.teamId !== actor.teamId)) {
      enemy.y = actor.y + 5;
    }
    expect(
      aiCommand(snapshot, actor.id, content, content.ai['ai-balanced']!, createAIState(1))
        .jumpPressed,
    ).toBe(true);
    actor.knockedOut = true;
    const command = aiCommand(
      snapshot,
      actor.id,
      content,
      content.ai['ai-balanced']!,
      createAIState(1),
    );
    expect(command.moveX).toBe(0);
    expect(Object.values(command).some((value) => value === true)).toBe(false);
  });

  it('all 30 robots complete seeded CPU matches and shared RNG frames replay identically', () => {
    const characters = Object.keys(content.characters);
    const fields = Object.keys(content.arenas);
    for (let offset = 0; offset < characters.length; offset += 4) {
      const battleSetup = scenario(
        Array.from({ length: 4 }, (_, i) => characters[(offset + i) % characters.length]!),
        fields[offset % fields.length],
      );
      const battle = createBattle({ content, setup: battleSetup });
      const replay = createBattle({ content, setup: battleSetup });
      const memories = Object.fromEntries(
        battle.getSnapshot().combatants.map((actor) => [actor.id, createAIState(setup.seed)]),
      );
      let attacks = 0;
      const recent: CommandFrame[] = [];
      while (!battle.getResult()) {
        const snapshot = battle.getSnapshot();
        let draws = 0;
        const random = () =>
          content.rules[setup.rulesId]!.original.battleRandom[
            (snapshot.randomCursor + draws++) & 255
          ]!;
        const commands = Object.fromEntries(
          snapshot.combatants.map((actor) => [
            actor.id,
            aiCommand(
              snapshot,
              actor.id,
              content,
              content.ai['ai-balanced']!,
              memories[actor.id]!,
              random,
            ),
          ]),
        );
        const frame: CommandFrame = { tick: snapshot.tick + 1, commands, aiRandomDraws: draws };
        recent.push(frame);
        if (recent.length > 3) {
          recent.shift();
        }
        battle.step(frame);
        replay.step(structuredClone(frame));
        attacks += battle.drainEvents().filter((event) => event.type === 'attackStarted').length;
        replay.drainEvents();
        if (snapshot.tick > 16000) {
          throw new Error(
            `seed ${setup.seed}; recent ${JSON.stringify(recent)}; snapshot ${JSON.stringify(snapshot)}`,
          );
        }
      }
      expect(attacks, `roster group ${offset}`).toBeGreaterThan(10);
      expect(replay.getSnapshot()).toEqual(battle.getSnapshot());
      expect(replay.getResult()).toEqual(battle.getResult());
    }
  }, 120000);
});
