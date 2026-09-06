import { it, expect } from 'vitest';

import { createBattle } from '../src/battle-core';
import { buildContentCatalog } from '../src/content/build-content-catalog';
import { content, documents, fixture, frame, setup, runBattleScenario } from './helpers';

it('all four loadouts can activate each normal slot after their original readiness fills', () => {
  for (const slot of ['headPressed', 'rightArmPressed', 'leftArmPressed'] as const) {
    const battle = createBattle({ setup, content });
    for (let tick = 1; tick <= 80; tick++) {
      battle.step(frame(tick));
    }
    battle.step(
      frame(81, Object.fromEntries(['A1', 'B1', 'A2', 'B2'].map((id) => [id, { [slot]: true }]))),
    );
    expect(battle.drainEvents().filter((event) => event.type === 'attackStarted')).toHaveLength(4);
  }
});

it('a speed-index edit changes real movement and a power edit changes real damage', () => {
  const faster = fixture((definition) => {
    if (definition.kind === 'part' && definition.id === 'metabee-legs') {
      definition.speedIndex = 6;
    }
  });
  const run = (catalog: typeof content) =>
    runBattleScenario({
      content: catalog,
      maxTicks: 12,
      commandFrames: (snapshot) => frame(snapshot.tick + 1, { A1: { moveX: 1 } }),
    });
  expect(run(faster).snapshot.combatants[0]!.x).toBeGreaterThan(
    run(content).snapshot.combatants[0]!.x,
  );
  const change = (power: number) =>
    fixture((definition) => {
      if (definition.kind === 'ability' && definition.id === 'metabee-right-arm-attack') {
        definition.damage = power;
      }
      if (definition.kind === 'arena') {
        definition.spawns = [
          { x: -3, y: 0 },
          { x: 3, y: 0 },
          { x: -24, y: 0 },
          { x: 24, y: 0 },
        ];
        definition.original.tiles = Array.from({ length: 46 }, () => Array<number>(54).fill(0));
      }
    });
  const shot = (power: number) =>
    runBattleScenario({
      content: change(power),
      maxTicks: 130,
      commandFrames: (snapshot) =>
        frame(snapshot.tick + 1, { A1: { rightArmPressed: snapshot.tick === 80 } }),
    }).events.find((event) => event.type === 'hit')!.damage!;
  expect(shot(20)).toBeGreaterThan(shot(5));
});

it('new file-defined characters reuse existing parts and behavior without core changes', () => {
  const catalog = buildContentCatalog([
    ...documents,
    {
      path: 'brass-beetle.jsonc',
      text: JSON.stringify({
        ...content.characters.metabee,
        id: 'brass-beetle',
        displayName: 'Brass Beetle',
      }),
    },
  ]);
  const custom = structuredClone(setup);
  custom.teams[0]!.combatants[0]!.characterId = 'brass-beetle';
  const battle = createBattle({ setup: custom, content: catalog });
  for (let tick = 1; tick <= 80; tick++) {
    battle.step(frame(tick, {}, custom));
  }
  battle.step(frame(81, { A1: { rightArmPressed: true } }, custom));
  expect(battle.getSnapshot().combatants[0]!).toMatchObject({
    characterId: 'brass-beetle',
    attack: { abilityId: 'metabee-right-arm-attack' },
  });
});

it('all nineteen original collision fields instantiate and simulate with bounded positions', () => {
  expect(Object.keys(content.arenas)).toHaveLength(19);
  for (const arena of Object.values(content.arenas)) {
    const custom = { ...setup, arenaId: arena.id };
    const run = runBattleScenario({
      setup: custom,
      maxTicks: 200,
      commandFrames: (snapshot) =>
        frame(
          snapshot.tick + 1,
          {
            A1: {
              moveX: 1,
              jumpPressed: snapshot.tick === 10,
              jumpHeld: snapshot.tick >= 10 && snapshot.tick < 23,
            },
          },
          custom,
        ),
    });
    for (const actor of run.snapshot.combatants) {
      expect(Number.isFinite(actor.x) && Number.isFinite(actor.y)).toBe(true);
      expect(actor.x).toBeGreaterThanOrEqual(-26);
      expect(actor.x).toBeLessThanOrEqual(26);
      expect(actor.y).toBeGreaterThanOrEqual(0);
    }
  }
});
