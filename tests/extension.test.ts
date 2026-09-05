import { it, expect } from 'vitest';
import { createBattle } from '../src/battle-core';
import { buildContentCatalog } from '../src/content/build-content-catalog';
import { content, documents, fixture, frame, setup, runBattleScenario } from './helpers';
it('every initial combatant can use all three normal slots and its configured special', () => {
  const battle = createBattle({ setup, content });
  const events = [];
  for (let tick = 1; tick <= 461; tick++) {
    const commands = Object.fromEntries(
      ['A1', 'A2', 'B1', 'B2'].map((id) => [
        id,
        {
          headPressed: tick === 1,
          rightArmPressed: tick === 81,
          leftArmPressed: tick === 141,
          chargeHeld: tick >= 201 && tick <= 460,
          specialPressed: tick === 461,
        },
      ]),
    );
    battle.step(frame(tick, commands));
    events.push(...battle.drainEvents());
  }
  expect(events.filter((e) => e.type === 'attackStarted')).toHaveLength(12);
  expect(events.filter((e) => e.type === 'specialActivated').map((e) => e.combatantId)).toEqual([
    'A1',
    'A2',
    'B1',
    'B2',
  ]);
  for (const c of battle.getSnapshot().combatants) {
    expect(c.attack?.abilityId).toBe(content.characters[c.characterId]!.specialAbilityId);
    expect(c.specialMeter).toBe(0);
  }
});
it('a damage edit changes real collision damage and a speed edit changes real movement', () => {
  const changed = fixture((d) => {
    if (d.id === 'metabee-head-attack') d.damage = 42;
    if (d.id === 'metabee-legs') d.movement.speed = 12;
    if (d.kind === 'arena')
      d.spawns = [
        { x: -2, y: 0 },
        { x: -13, y: 0 },
        { x: 2, y: 0 },
        { x: 14, y: 0 },
      ];
  });
  const shot = runBattleScenario({
    content: changed,
    maxTicks: 25,
    commandFrames: (s) => frame(s.tick + 1, { A1: { headPressed: s.tick === 0 } }),
  });
  expect(shot.snapshot.combatants[2]!.parts.rightArm.currentArmor).toBe(358);
  const movement = runBattleScenario({
    content: changed,
    maxTicks: 20,
    commandFrames: (s) => frame(s.tick + 1, { A1: { moveX: 1 } }),
  });
  expect(movement.snapshot.combatants[0]!.vx).toBe(12);
});
it('a new file-defined character reuses existing parts and mechanics without battle-code changes', () => {
  const catalog = buildContentCatalog([
    ...documents,
    {
      path: 'game-data/characters/brass-beetle/character.jsonc',
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
  battle.step(frame(1, { A1: { rightArmPressed: true } }, custom));
  expect(battle.getSnapshot().combatants[0]).toMatchObject({
    characterId: 'brass-beetle',
    attack: { abilityId: 'metabee-right-arm-attack' },
  });
});
it('separates grounded bodies while allowing a dash through an opponent', () => {
  const close = fixture((d) => {
    if (d.kind === 'arena')
      d.spawns = [
        { x: -0.3, y: 0 },
        { x: -13, y: 0 },
        { x: 0.3, y: 0 },
        { x: 14, y: 0 },
      ];
  });
  const battle = createBattle({ setup, content: close });
  battle.step(frame(1));
  const initial = battle.getSnapshot().combatants;
  expect(initial[2]!.x - initial[0]!.x).toBeCloseTo(1.5);
  battle.step(frame(2, { A1: { moveX: 1 } }));
  battle.step(frame(3));
  for (let tick = 4; tick <= 12; tick++) battle.step(frame(tick, { A1: { moveX: 1 } }));
  const final = battle.getSnapshot().combatants;
  expect(final[0]!.x).toBeGreaterThan(final[2]!.x);
});
