import { expect, it } from 'vitest';

import { createBattle } from '../src/battle-core';
import { movePixels, pixelX, pixelY, supported } from '../src/battle-core/ax-movement';
import { updatePlatforms } from '../src/battle-core/platforms';
import { moveWithTerrain, terrainMovement } from '../src/battle-core/terrain';
import type { BattleContext } from '../src/battle-core/types';
import { content, fixture, frame, setup } from './helpers';

function terrainContext(material: number): BattleContext {
  const catalog = fixture((definition) => {
    if (definition.kind === 'arena') {
      definition.original.tiles = Array.from({ length: 46 }, (_, row) =>
        Array<number>(54).fill(row === 30 ? material : 0),
      );
      definition.original.movingPlatforms = [];
      definition.spawns[0] = { x: 0, y: 16 };
    }
  });
  return {
    setup,
    content: catalog,
    state: createBattle({ setup, content: catalog }).getSnapshot(),
    events: [],
    nextEntityId: 1,
    rngState: setup.seed,
  };
}

it('follows a source three-tile slope in both directions without falling through it', () => {
  const catalog = fixture((definition) => {
    if (definition.kind === 'arena') {
      definition.original.tiles = Array.from({ length: 46 }, () => Array<number>(54).fill(0));
      definition.original.tiles[30]!.splice(10, 3, 2, 3, 4);
      definition.spawns[0] = { x: (80 - 216) / 8, y: (367 - 239) / 8 };
    }
  });
  const context: BattleContext = {
    setup,
    content: catalog,
    state: createBattle({ setup, content: catalog }).getSnapshot(),
    events: [],
    nextEntityId: 1,
    rngState: setup.seed,
  };
  const actor = context.state.combatants[0]!;
  movePixels(context, actor, 23, 0);
  expect([pixelX(actor), pixelY(actor), actor.grounded]).toEqual([103, 246, true]);
  movePixels(context, actor, -23, 0);
  expect([pixelX(actor), pixelY(actor), actor.grounded]).toEqual([80, 239, true]);
});

it('the source field-2 platform reaches 296, waits 40 updates and returns to 216', () => {
  const battle = createBattle({ setup: { ...setup, arenaId: 'ax-field-02' }, content });
  const positions = new Map<number, number>();
  for (let tick = 1; tick <= 240; tick++) {
    battle.step(frame(tick));
    if ([1, 80, 120, 121, 200, 240].includes(tick)) {
      positions.set(tick, battle.getSnapshot().platforms[0]!.y);
    }
  }
  expect([...positions]).toEqual([
    [1, 217],
    [80, 296],
    [120, 296],
    [121, 295],
    [200, 216],
    [240, 216],
  ]);
  expect(JSON.parse(JSON.stringify(battle.getSnapshot())).platforms[0].id).toBe('moving-0');
});

it('a one-way moving platform supports and transports a rider through collision', () => {
  const context = terrainContext(0);
  context.state.platforms.push({
    id: 'test-platform',
    x: 192,
    y: 240,
    width: 48,
    direction: 4,
    minimum: 240,
    maximum: 260,
    endpointWaitTicks: 40,
    waitTicks: 0,
  });
  const actor = context.state.combatants[0]!;
  expect(supported(context, actor)).toBe(true);
  updatePlatforms(context);
  expect(pixelY(actor)).toBe(240);
  expect(actor.transported).toBe(true);
  actor.y += 2;
  movePixels(context, actor, 0, 24);
  expect(pixelY(actor)).toBe(240);
  expect(actor.grounded).toBe(true);
});

it('passes upward through a one-way surface and only lands while descending', () => {
  const context = terrainContext(1);
  const actor = context.state.combatants[0]!;
  actor.y -= 1 / 8;
  movePixels(context, actor, 0, -1);
  expect(pixelY(actor)).toBe(239);
  expect(actor.grounded).toBe(false);
  movePixels(context, actor, 0, -8);
  expect(pixelY(actor)).toBe(231);
  movePixels(context, actor, 0, 20);
  expect(pixelY(actor)).toBe(239);
  expect(actor.grounded).toBe(true);
});

it('ice retains momentum on release and reversal while normal ground stops', () => {
  const context = terrainContext(0x11);
  const actor = context.state.combatants[0]!;
  expect(terrainMovement(context, actor, 3)).toBe(3);
  expect(actor.iceMomentum).toBe(96);
  expect(terrainMovement(context, actor, 0)).toBe(2);
  expect(actor.iceMomentum).toBe(95);
  expect(terrainMovement(context, actor, -2)).toBe(2);
  expect(actor.iceMomentum).toBe(92);
  const ordinary = terrainContext(1);
  expect(terrainMovement(ordinary, ordinary.state.combatants[0]!, 0)).toBe(0);
});

it('conveyors are a post-state move and do not apply during jumping', () => {
  const context = terrainContext(0x31);
  const actor = context.state.combatants[0]!;
  moveWithTerrain(context, actor);
  expect(pixelX(actor)).toBe(217);
  actor.movementState = 'jump';
  moveWithTerrain(context, actor);
  expect(pixelX(actor)).toBe(217);
  const reverse = terrainContext(0x41);
  moveWithTerrain(reverse, reverse.state.combatants[0]!);
  expect(pixelX(reverse.state.combatants[0]!)).toBe(215);
});
