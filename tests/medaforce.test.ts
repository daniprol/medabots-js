import { expect, it } from 'vitest';

import { createBattle } from '../src/battle-core';
import { applyDamage } from '../src/battle-core/damage';
import type { BattleContext } from '../src/battle-core/types';
import { content, fixture, frame, setup } from './helpers';

it.each([
  ['metabee-head-attack', 51],
  ['metabee-right-arm-attack', 2],
  ['metabee-left-arm-attack', 11],
  ['metabee-medaforce', 19],
] as const)('matches source medal/defense arithmetic for %s', (abilityId, damage) => {
  const context: BattleContext = {
    setup,
    content,
    state: createBattle({ setup, content }).getSnapshot(),
    events: [],
    nextEntityId: 1,
    rngState: setup.seed,
  };
  const source = context.state.combatants[0]!;
  const target = context.state.combatants[1]!;
  applyDamage(context, target, 'rightArm', source, content.abilities[abilityId]!, 1);
  expect(context.events.find((event) => event.type === 'hit')!.damage).toBe(damage);
});

it.each([
  ['metabee', 4],
  ['rokusho', 1],
] as const)(
  '%s launches the original number of special objects after startup',
  (characterId, count) => {
    const catalog = fixture((definition) => {
      if (definition.kind === 'arena') {
        definition.original.tiles = Array.from({ length: 46 }, () => Array<number>(54).fill(0));
        definition.spawns = [
          { x: -20, y: 0 },
          { x: 20, y: 0 },
          { x: -24, y: 0 },
          { x: 24, y: 0 },
        ];
      }
    });
    const customSetup = structuredClone(setup);
    customSetup.teams[0]!.combatants[0]!.characterId = characterId;
    const battle = createBattle({ setup: customSetup, content: catalog });
    for (let tick = 1; tick <= 1800; tick++) {
      battle.step(frame(tick));
    }
    battle.step(frame(1801, { A1: { specialPressed: true } }));
    const remaining = battle.getSnapshot().remainingTicks;
    for (let tick = 1802; tick <= 1862; tick++) {
      battle.step(frame(tick));
      expect(battle.getSnapshot().projectiles).toHaveLength(0);
      expect(battle.getSnapshot().remainingTicks).toBe(remaining);
    }
    battle.step(frame(1863)); // A1 animation initialized at 1804, effect appears at +59.
    const snapshot = battle.getSnapshot();
    expect(snapshot.projectiles).toHaveLength(count);
    expect(snapshot.combatants[0]!.specialMeter).toBe(0);
    expect(snapshot.specialFreezeTicks).toBe(0);
    const origin = snapshot.projectiles[0]!.x;
    battle.step(frame(1864));
    if (characterId === 'rokusho') {
      expect((battle.getSnapshot().projectiles[0]!.x - origin) * 8).toBe(6);
    }
    expect(new Set(snapshot.projectiles.map((projectile) => projectile.id)).size).toBe(count);
  },
);
