import { describe, expect, it } from 'vitest';

import { createBattle } from '../src/battle-core';
import { emptyCommand } from '../src/battle-core';
import { quarterPixels } from '../src/battle-core/ax-movement';
import { updateAttack } from '../src/battle-core/combat';
import { calculateDamage, applyDamage } from '../src/battle-core/damage';
import { moveCombatant } from '../src/battle-core/movement';
import { selectHitPart } from '../src/battle-core/part-selection';
import { battleRandom } from '../src/battle-core/random';
import { finishAtTimeout } from '../src/battle-core/results';
import type { BattleContext } from '../src/battle-core/types';
import jumpTrace from './fixtures/ax-clear-jump.json';
import { content, setup, fixture, frame, runBattleScenario } from './helpers';

function contextFixture(): BattleContext {
  return {
    setup,
    content,
    state: createBattle({ setup, content }).getSnapshot(),
    events: [],
    nextEntityId: 1,
    rngState: setup.seed,
  };
}

function flatField() {
  return fixture((definition) => {
    if (definition.kind === 'arena') {
      definition.spawns = [
        { x: -4, y: 0 },
        { x: 4, y: 0 },
        { x: -24, y: 0 },
        { x: 24, y: 0 },
      ];
      definition.original.tiles = Array.from({ length: 46 }, () => Array<number>(54).fill(0));
    }
  });
}

describe('source-derived AX movement', () => {
  it('matches every recorded original full-jump position, including the landing', () => {
    const catalog = fixture((definition) => {
      if (definition.kind === 'arena') {
        definition.spawns[0] = { x: (81 - 216) / 8, y: 7 };
      }
    });
    const battle = createBattle({ setup, content: catalog });
    for (const [index, sample] of jumpTrace.samples.entries()) {
      battle.step(
        frame(index + 1, { A1: { jumpPressed: index === 0, jumpHeld: sample.jumpHeld } }),
      );
      const actor = battle.getSnapshot().combatants[0]!;
      expect(
        { x: actor.x * 8 + 216, bottomY: 367 - actor.y * 8 },
        `Original frame ${jumpTrace.startFrame + index}`,
      ).toEqual({ x: sample.x, bottomY: sample.bottomY });
    }
    expect(battle.getSnapshot().combatants[0]!.grounded).toBe(true);
  });

  it.each([
    [1, 52],
    [7, 78],
    [12, 108],
  ])('holding A for %i ticks gives the original %i-pixel height', (heldTicks, height) => {
    const battle = createBattle({ setup, content: flatField() });
    let peak = 0;
    for (let tick = 1; tick <= 70; tick++) {
      battle.step(frame(tick, { A1: { jumpPressed: tick === 1, jumpHeld: tick <= heldTicks } }));
      peak = Math.max(peak, battle.getSnapshot().combatants[0]!.y * 8);
    }
    expect(peak).toBe(height);
    expect(battle.getSnapshot().combatants[0]!.y).toBe(0);
  });

  it('uses asymmetric quarter-pixel residual arithmetic', () => {
    let residual = 4;
    const pixels = Array.from({ length: 4 }, () => {
      const result = quarterPixels(11, residual, true);
      residual = result.residual;
      return result.pixels;
    });
    expect(pixels).toEqual([2, 3, 3, 3]);
    expect(quarterPixels(6, 2, false)).toEqual({ pixels: 2, residual: 4 });
  });

  it('walks immediately after its transition and stops without an acceleration tail', () => {
    const battle = createBattle({ setup, content: flatField() });
    battle.step(frame(1, { A1: { moveX: 1 } }));
    expect(battle.getSnapshot().combatants[0]!.x).toBe(-4);
    battle.step(frame(2, { A1: { moveX: 1 } }));
    expect(battle.getSnapshot().combatants[0]!.x).toBe(-3.75);
    battle.step(frame(3));
    expect(battle.getSnapshot().combatants[0]!.vx).toBe(0);
  });

  it('detects a double tap from tick commands, and supports drop through a one-way platform', () => {
    const battle = createBattle({ setup, content });
    battle.step(frame(1, { A1: { moveX: 1 } }));
    battle.step(frame(2));
    battle.step(frame(3, { A1: { moveX: 1 } }));
    expect(battle.getSnapshot().combatants[0]!.movementState).toBe('dash');
    battle.step(frame(4, { A2: { dropHeld: true, jumpPressed: true } }));
    expect(battle.getSnapshot().combatants.find((actor) => actor.id === 'A2')!.y).toBeLessThan(16);
  });

  it('broken starting legs keep jump height and switch to speed row 2', () => {
    const context = contextFixture();
    const actor = context.state.combatants[0]!;
    actor.parts.legs.destroyed = true;
    actor.parts.legs.currentArmor = 0;
    actor.x = (81 - 216) / 8;
    const start = actor.y;
    let peak = start;
    for (let tick = 1; tick <= 65; tick++) {
      context.state.tick = tick;
      moveCombatant(context, actor, {
        ...emptyCommand(),
        jumpPressed: tick === 1,
        jumpHeld: tick <= 12,
      });
      peak = Math.max(peak, actor.y);
    }
    expect((peak - start) * 8).toBe(108);
    moveCombatant(context, actor, { ...emptyCommand(), moveX: 1 });
    const x = actor.x;
    for (let index = 0; index < 4; index++) {
      moveCombatant(context, actor, { ...emptyCommand(), moveX: 1 });
    }
    // Ground movement applies a further half-pixel adjustment below two pixels.
    expect((actor.x - x) * 8).toBe(8);
  });
});

describe('AX damage and part selection', () => {
  it('applies integer defense arithmetic with a minimum of two', () => {
    expect(calculateDamage(40, 3)).toBe(37);
    expect(calculateDamage(40, 6)).toBe(34);
    expect(calculateDamage(1, 10)).toBe(2);
  });

  it('heads are eligible while every limb is intact; starter medals prefer legs', () => {
    const context = contextFixture();
    const actor = context.state.combatants[1]!;
    const slots = new Set<string>();
    for (let index = 0; index < 256; index++) {
      slots.add(selectHitPart(context, actor, false));
    }
    expect([...slots].sort()).toEqual(['head', 'leftArm', 'legs', 'rightArm']);
    expect(selectHitPart(context, actor, true)).toBe('legs');
    actor.parts.legs.destroyed = true;
    actor.parts.leftArm.destroyed = true;
    actor.parts.rightArm.destroyed = true;
    expect(selectHitPart(context, actor, false)).toBe('head');
  });

  it('Scouting increases head weight, without turning weight into a percentage', () => {
    const normal = contextFixture();
    const scouting = contextFixture();
    let normalHeads = 0;
    let scoutingHeads = 0;
    for (let index = 0; index < 256; index++) {
      normalHeads += Number(selectHitPart(normal, normal.state.combatants[1]!, false) === 'head');
      scoutingHeads += Number(
        selectHitPart(scouting, scouting.state.combatants[1]!, false, 41) === 'head',
      );
    }
    expect(scoutingHeads).toBeGreaterThan(normalHeads);
  });

  it('head KO ends a leader battle immediately but partner KO does not', () => {
    for (const index of [1, 3]) {
      const context = contextFixture();
      const target = context.state.combatants[index]!;
      target.parts.head.currentArmor = 1;
      applyDamage(
        context,
        target,
        'head',
        context.state.combatants[0]!,
        content.abilities['metabee-head-attack']!,
        1,
      );
      expect(target.knockedOut).toBe(true);
      expect(Boolean(context.state.result)).toBe(index === 1);
      expect(context.events.filter((event) => event.type === 'partDestroyed')).toHaveLength(1);
    }
  });

  it('limb overkill never spills into the head, and broken arms retain their frame strike', () => {
    const context = contextFixture();
    const actor = context.state.combatants[0]!;
    actor.parts.rightArm.currentArmor = 1;
    applyDamage(
      context,
      actor,
      'rightArm',
      context.state.combatants[1]!,
      content.abilities['metabee-head-attack']!,
      -1,
    );
    expect(actor.parts.head.currentArmor).toBe(45);
    expect(actor.parts.rightArm.destroyed).toBe(true);
    actor.parts.rightArm.readiness = 320;
    actor.staggerTicks = 0;
    updateAttack(context, actor, { ...emptyCommand(), rightArmPressed: true });
    expect(actor.attack?.abilityId).toBe('frame-attack');
  });

  it('guard quarters power before defense, only from the front, and blocks actions', () => {
    const damages: number[] = [];
    for (const facing of [-1, 1] as const) {
      const context = contextFixture();
      const target = context.state.combatants[1]!;
      target.guarding = true;
      target.facing = facing;
      const before = target.parts.head.currentArmor;
      applyDamage(
        context,
        target,
        'head',
        context.state.combatants[0]!,
        content.abilities['metabee-head-attack']!,
        1,
      );
      damages.push(before - target.parts.head.currentArmor);
    }
    expect(damages[0]).toBeLessThan(damages[1]!);
    const context = contextFixture();
    const actor = context.state.combatants[0]!;
    actor.parts.rightArm.readiness = 320;
    updateAttack(context, actor, { ...emptyCommand(), guardHeld: true, rightArmPressed: true });
    expect(actor.attack).toBeNull();
  });
});

describe('headless match and action lifecycle', () => {
  it('uses distinct Sword combo timing and readiness for each buffered attack press', () => {
    const battle = createBattle({ setup, content: flatField() });
    const contacts: number[] = [];
    const stages: number[] = [];
    let previousContact = false;
    let previousStage = -1;
    for (let tick = 1; tick <= 144; tick++) {
      battle.step(frame(tick, { B1: { rightArmPressed: [81, 87, 103].includes(tick) } }));
      const actor = battle.getSnapshot().combatants[1]!;
      if (actor.attack?.contactFired && !previousContact) {
        contacts.push(tick);
      }
      if (actor.attack && actor.attack.comboStage !== previousStage) {
        stages.push(actor.parts.rightArm.readiness);
        previousStage = actor.attack.comboStage;
      }
      previousContact = actor.attack?.contactFired ?? false;
    }
    expect(contacts).toEqual([85, 103, 125]);
    expect(stages).toEqual([213, 106, 0]);
    expect(battle.getSnapshot().combatants[1]!.attack).toBeNull();
  });

  it('a single B press cannot start the second Sword combo stage', () => {
    const battle = createBattle({ setup, content: flatField() });
    for (let tick = 1; tick <= 96; tick++) {
      battle.step(frame(tick, { B1: { rightArmPressed: tick === 81 } }));
    }
    expect(battle.getSnapshot().combatants[1]!.attack).toBeNull();
    expect(battle.getSnapshot().combatants[1]!.parts.rightArm.readiness).toBe(213);
  });

  it('uses original actor ordering, stats and detached serializable snapshots', () => {
    const battle = createBattle({ setup, content });
    const snapshot = battle.getSnapshot();
    expect(snapshot.combatants.map((actor) => actor.id)).toEqual(['A1', 'B1', 'A2', 'B2']);
    expect(snapshot.combatants[0]!.parts.head.currentArmor).toBe(45);
    expect(snapshot.combatants[0]!.x).toBe(-18.375);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    snapshot.combatants[0]!.parts.head.currentArmor = 0;
    expect(battle.getSnapshot().combatants[0]!.parts.head.currentArmor).toBe(45);
    expect(typeof window).toBe('undefined');
  });

  it('refills weapons separately from animation and emits stable projectiles', () => {
    const battle = createBattle({ setup, content: flatField() });
    for (let tick = 1; tick <= 80; tick++) {
      battle.step(frame(tick));
    }
    battle.step(frame(81, { A1: { rightArmPressed: true } }));
    expect(battle.getSnapshot().combatants[0]!.parts.rightArm.readiness).toBe(213);
    for (let tick = 82; tick <= 87; tick++) {
      battle.step(frame(tick));
    }
    const snapshot = battle.getSnapshot();
    expect(snapshot.projectiles[0]!.id).toBe('projectile-1');
    expect(JSON.parse(JSON.stringify(snapshot)).projectiles[0].id).toBe('projectile-1');
    for (let tick = 88; tick <= 120; tick++) {
      battle.step(frame(tick));
    }
    expect(battle.getSnapshot().combatants[0]!.attack).toBeNull();
    expect(battle.getSnapshot().combatants[0]!.parts.rightArm.readiness).toBe(320);
  });

  it('projectiles damage opponents, expire once, and scripted commands finish a battle', () => {
    const catalog = flatField();
    const run = runBattleScenario({
      content: catalog,
      maxTicks: 9000,
      commandFrames: (snapshot) =>
        frame(snapshot.tick + 1, {
          A1: {
            moveX: snapshot.combatants[1]!.x - snapshot.combatants[0]!.x > 6 ? 1 : 0,
            rightArmPressed: snapshot.tick > 80 && snapshot.tick % 40 === 0,
            headPressed: snapshot.tick > 80 && snapshot.tick % 201 === 0,
          },
        }),
    });
    expect(run.events.some((event) => event.type === 'hit' && event.targetId === 'B1')).toBe(true);
    expect(run.events.some((event) => event.type === 'hit' && event.targetId === 'A2')).toBe(false);
    expect(run.result?.winnerTeamId, JSON.stringify(run.snapshot)).toBe('team-a');
  });

  it('normal melee contact damages a target at most once per activation', () => {
    const catalog = fixture((definition) => {
      if (definition.kind === 'arena') {
        definition.spawns = [
          { x: -1, y: 0 },
          { x: 1, y: 0 },
          { x: -24, y: 0 },
          { x: 24, y: 0 },
        ];
        definition.original.tiles = Array.from({ length: 46 }, () => Array<number>(54).fill(0));
      }
    });
    const run = runBattleScenario({
      content: catalog,
      maxTicks: 110,
      commandFrames: (snapshot) =>
        frame(snapshot.tick + 1, { B1: { rightArmPressed: snapshot.tick === 80 } }),
    });
    expect(
      run.events.filter((event) => event.type === 'hit' && event.targetId === 'A1'),
    ).toHaveLength(1);
  });

  it('idle charging reaches 51 without a charge button; special resets meter and readiness', () => {
    const battle = createBattle({ setup, content });
    for (let tick = 1; tick <= 1000; tick++) {
      battle.step(frame(tick));
    }
    expect(battle.getSnapshot().combatants[0]!.displayMeter).toBe(51);
    battle.step(frame(1001, { A1: { specialPressed: true } }));
    expect(battle.getSnapshot().combatants[0]!.specialMeter).toBe(51);
    expect(battle.getSnapshot().specialFreezeTicks).toBeGreaterThan(0);
    expect(battle.drainEvents().some((event) => event.type === 'specialActivated')).toBe(true);
  });

  it('support effects survive the head animation and buff both teammates', () => {
    const battle = createBattle({ setup, content: flatField() });
    for (let tick = 1; tick <= 80; tick++) {
      battle.step(frame(tick));
    }
    battle.step(frame(81, { B1: { headPressed: true } }));
    for (let tick = 82; tick <= 140; tick++) {
      battle.step(frame(tick));
    }
    const actors = battle.getSnapshot().combatants;
    expect(actors[1]!.beneficialStatus?.kind).toBe('scouting');
    expect(actors[1]!.beneficialStatus?.magnitude).toBe(41);
    expect(actors[3]!.beneficialStatus?.kind).toBe('scouting');
    expect(actors[0]!.beneficialStatus).toBeNull();
  });

  it('replays identical command frames deterministically and rejects incomplete frames', () => {
    const commands = (snapshot: ReturnType<ReturnType<typeof createBattle>['getSnapshot']>) =>
      frame(snapshot.tick + 1, {
        A1: { moveX: snapshot.tick < 30 ? 1 : 0, rightArmPressed: snapshot.tick % 60 === 0 },
      });
    const first = runBattleScenario({ maxTicks: 400, commandFrames: commands });
    const second = runBattleScenario({ maxTicks: 400, commandFrames: commands });
    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.events).toEqual(second.events);
    expect(() => first.battle.step({ tick: 401, commands: {} })).toThrow(
      /Invalid or missing command/,
    );
  });

  it('timeout uses survival, leader HP, lower medal level and a random final tie; no draw', () => {
    const context = contextFixture();
    context.state.combatants[0]!.medalLevel = 2;
    // Make armor comparisons exactly equal before testing the level criterion.
    context.state.combatants[1]!.parts = structuredClone(context.state.combatants[0]!.parts);
    finishAtTimeout(context);
    expect(context.state.result?.winnerTeamId).toBe('team-b');
    const tied = contextFixture();
    tied.state.combatants[1]!.parts = structuredClone(tied.state.combatants[0]!.parts);
    tied.state.randomCursor = 0;
    finishAtTimeout(tied);
    expect(tied.state.result).toMatchObject({ winnerTeamId: 'team-a', reason: 'timeout' });
  });

  it('consumes the original random-byte stream, including its duplicate and wrap', () => {
    const context = contextFixture();
    context.state.randomCursor = 0;
    expect(Array.from({ length: 4 }, () => battleRandom(context))).toEqual([71, 174, 3, 243]);
    context.state.randomCursor = 255;
    expect(battleRandom(context)).toBe(11);
    expect(battleRandom(context)).toBe(71);
  });

  it('commits a partner panel after ten further updates', () => {
    const battle = createBattle({ setup, content });
    battle.step(frame(1, { A1: { strategyPressed: true } }));
    for (let tick = 2; tick <= 10; tick++) {
      battle.step(frame(tick));
    }
    expect(battle.getSnapshot().combatants[2]!.panel).toBe(6);
    battle.step(frame(11));
    expect(battle.getSnapshot().combatants[2]!.panel).toBe(30);
  });
});
