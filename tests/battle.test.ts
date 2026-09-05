import { describe, it, expect } from 'vitest';
import { createBattle, emptyCommand } from '../src/battle-core';
import { content, setup, frame, fixture, closeArena, runBattleScenario } from './helpers';
import { aiCommand, createAIState } from '../src/battle-session/ai-controller';
import { nextRandom } from '../src/battle-core/random';
const shootHead = (s: ReturnType<ReturnType<typeof createBattle>['getSnapshot']>) =>
  frame(s.tick + 1, { A1: { headPressed: s.tick % 30 === 0 } });
describe('battle integration in Node without browser globals', () => {
  it('instantiates all four characters; snapshots are detached, serializable, and stable', () => {
    const battle = createBattle({ setup, content });
    const snapshot = battle.getSnapshot();
    expect(snapshot.combatants.map((c) => c.characterId)).toEqual([
      'metabee',
      'arcbeetle',
      'rokusho',
      'warbandit',
    ]);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    snapshot.combatants[0]!.parts.head.currentArmor = 0;
    snapshot.combatants[0]!.x = 999;
    expect(battle.getSnapshot().combatants[0]!.parts.head.currentArmor).toBe(600);
    expect(battle.getSnapshot().combatants[0]!.x).toBe(-9);
    expect(typeof window).toBe('undefined');
  });
  it('scripted projectile hits the head and ends a match when leader head is destroyed', () => {
    const run = runBattleScenario({
      content: closeArena(false, true),
      maxTicks: 1500,
      commandFrames: shootHead,
    });
    expect(run.result, JSON.stringify(run.snapshot)).toMatchObject({
      winnerTeamId: 'team-a',
      reason: 'leader-head-destroyed',
    });
    expect(run.events.some((e) => e.type === 'partDestroyed' && e.part === 'head')).toBe(true);
    expect(run.result!.finalCombatants.find((c) => c.id === 'B1')!.knockedOut).toBe(true);
  });
  it('partner head knockout does not end the match', () => {
    const run = runBattleScenario({
      content: closeArena(true, true),
      maxTicks: 650,
      commandFrames: (s) =>
        s.combatants.find((c) => c.id === 'B2')!.knockedOut ? frame(s.tick + 1) : shootHead(s),
    });
    expect(run.snapshot.combatants.find((c) => c.id === 'B2')!.knockedOut).toBe(true);
    expect(run.result).toBeNull();
  });
  it('helmet hits protect the head, damage a surviving limb, and ignore teammates', () => {
    const run = runBattleScenario({
      content: closeArena(),
      maxTicks: 25,
      commandFrames: (s) => frame(s.tick + 1, { A1: { headPressed: s.tick === 0 } }),
    });
    const target = run.snapshot.combatants.find((c) => c.id === 'B1')!;
    expect(target.parts.head.currentArmor).toBe(600);
    expect(target.parts.legs.currentArmor).toBe(520);
    expect(target.parts.rightArm.currentArmor).toBe(385);
    expect(run.snapshot.combatants[1]!.parts.head.currentArmor).toBe(700);
  });
  it('projects stable IDs through a JSON round trip and consumes a projectile once', () => {
    const run = runBattleScenario({
      content: closeArena(),
      maxTicks: 8,
      commandFrames: (s) => frame(s.tick + 1, { A1: { headPressed: s.tick === 0 } }),
    });
    expect(run.snapshot.projectiles[0]?.id).toBe('projectile-1');
    expect(JSON.parse(JSON.stringify(run.snapshot)).projectiles[0].id).toBe('projectile-1');
    for (let t = 9; t < 40; t++) run.battle.step(frame(t));
    expect(run.battle.getSnapshot().projectiles).toHaveLength(0);
    expect(run.battle.getSnapshot().combatants[2]!.parts.rightArm.currentArmor).toBe(385);
  });
  it('guard reduces damage and knockback and prevents attacks', () => {
    const guard = runBattleScenario({
      content: closeArena(),
      maxTicks: 20,
      commandFrames: (s) =>
        frame(s.tick + 1, {
          A1: { headPressed: s.tick === 0 },
          B1: { guardHeld: true, headPressed: true },
        }),
    });
    const target = guard.snapshot.combatants[2]!;
    expect(target.parts.head.currentArmor).toBe(600);
    expect(target.parts.rightArm.currentArmor).toBe(396);
    expect(target.attack).toBeNull();
    expect(target.parts.head.uses).toBe(0);
    const unguarded = runBattleScenario({
      content: closeArena(),
      maxTicks: 20,
      commandFrames: (s) => frame(s.tick + 1, { A1: { headPressed: s.tick === 0 } }),
    });
    expect(target.x - 2).toBeLessThan(unguarded.snapshot.combatants[2]!.x - 2);
  });
  it('executes startup, active, recovery and returns to ready on tick boundaries', () => {
    const b = createBattle({ setup, content: closeArena() });
    b.step(frame(1, { A1: { headPressed: true } }));
    expect(b.getSnapshot().combatants[0]!.attack?.age).toBe(1);
    for (let t = 2; t <= 6; t++) b.step(frame(t));
    expect(b.getSnapshot().projectiles).toHaveLength(0);
    b.step(frame(7));
    expect(b.getSnapshot().projectiles).toHaveLength(1);
    for (let t = 8; t <= 21; t++) b.step(frame(t));
    expect(b.getSnapshot().combatants[0]!.attack).not.toBeNull();
    b.step(frame(22));
    expect(b.getSnapshot().combatants[0]!.attack).not.toBeNull();
    b.step(frame(23));
    expect(b.getSnapshot().combatants[0]!.attack).toBeNull();
  });
  it('melee activation hits each target once even across multiple active ticks', () => {
    const local = fixture((d) => {
      if (d.kind === 'arena')
        d.spawns = [
          { x: -0.5, y: 0 },
          { x: -13, y: 0 },
          { x: 1.5, y: 0 },
          { x: 14, y: 0 },
        ];
    });
    const run = runBattleScenario({
      content: local,
      maxTicks: 22,
      commandFrames: (s) => frame(s.tick + 1, { B1: { rightArmPressed: s.tick === 0 } }),
    });
    const hits = run.events.filter((e) => e.type === 'hit' && e.targetId === 'A1');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.part).toBe('rightArm');
    expect(run.snapshot.combatants[0]!.parts.rightArm.currentArmor).toBe(378);
  });
  it('destroyed arms disable their ability and emit destruction once', () => {
    const local = fixture((d) => {
      if (d.kind === 'arena')
        d.spawns = [
          { x: -0.5, y: 0 },
          { x: -13, y: 0 },
          { x: 1.5, y: 0 },
          { x: 14, y: 0 },
        ];
      if (d.id === 'metabee-right-arm') d.armor = 10;
    });
    const run = runBattleScenario({
      content: local,
      maxTicks: 40,
      commandFrames: (s) =>
        frame(s.tick + 1, {
          B1: { rightArmPressed: s.tick === 0 },
          A1: { rightArmPressed: s.tick === 30 },
        }),
    });
    expect(run.snapshot.combatants[0]!.parts.rightArm.destroyed).toBe(true);
    expect(run.snapshot.combatants[0]!.parts.rightArm.uses).toBe(0);
    expect(run.events.filter((e) => e.type === 'partDestroyed')).toHaveLength(1);
  });
  it('charges only grounded idle combatants and consumes the meter for a special', () => {
    const b = createBattle({ setup, content });
    for (let t = 1; t <= 260; t++) b.step(frame(t, { A1: { chargeHeld: true } }));
    expect(b.getSnapshot().combatants[0]!.specialMeter).toBe(100);
    b.step(frame(261, { A1: { specialPressed: true } }));
    expect(b.getSnapshot().combatants[0]!.attack?.slot).toBe('special');
    expect(b.getSnapshot().combatants[0]!.specialMeter).toBe(0);
    expect(b.drainEvents().some((e) => e.type === 'specialActivated')).toBe(true);
    const airborne = runBattleScenario({
      maxTicks: 20,
      commandFrames: (s) =>
        frame(s.tick + 1, { A1: { jumpPressed: s.tick === 0, chargeHeld: s.tick > 0 } }),
    });
    expect(airborne.snapshot.combatants[0]!.specialMeter).toBe(0);
  });
  it('times out by total remaining armor percentage, including draws', () => {
    const timeout = fixture((d) => {
      if (d.kind === 'rules') d.roundTimeMs = 1000;
      if (d.kind === 'arena')
        d.spawns = [
          { x: -2, y: 0 },
          { x: -13, y: 0 },
          { x: 2, y: 0 },
          { x: 14, y: 0 },
        ];
    });
    expect(runBattleScenario({ content: timeout, maxTicks: 60 }).result).toMatchObject({
      winnerTeamId: null,
      reason: 'draw',
      elapsedTicks: 60,
    });
    expect(
      runBattleScenario({
        content: timeout,
        maxTicks: 60,
        commandFrames: (s) => frame(s.tick + 1, { A1: { headPressed: s.tick === 0 } }),
      }).result,
    ).toMatchObject({ winnerTeamId: 'team-a', reason: 'timeout' });
  });
  it('same setup, seed and command frames produce identical snapshots/results', () => {
    const first = runBattleScenario({
      content: closeArena(),
      maxTicks: 1400,
      commandFrames: shootHead,
    });
    const second = runBattleScenario({
      content: closeArena(),
      maxTicks: 1400,
      commandFrames: shootHead,
    });
    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.events).toEqual(second.events);
  });
  it('AI plays a complete deterministic match from real content', () => {
    const run = () => {
      const memories = Object.fromEntries(
        ['A1', 'A2', 'B1', 'B2'].map((id, i) => [id, createAIState(setup.seed + i * 7919)]),
      );
      return runBattleScenario({
        commandFrames: (s) => ({
          tick: s.tick + 1,
          commands: Object.fromEntries(
            s.combatants.map((c) => [
              c.id,
              aiCommand(s, c.id, content, content.ai['ai-balanced']!, memories[c.id]!),
            ]),
          ),
        }),
      });
    };
    const a = run(),
      b = run();
    expect(a.result).not.toBeNull();
    expect(a.result!.elapsedTicks).toBeLessThan(10800);
    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.events.filter((e) => e.type === 'hit').length).toBeGreaterThan(10);
  });
  it('rejects out-of-order frames and missing commands without partially stepping', () => {
    const b = createBattle({ setup, content });
    expect(() => b.step(frame(2))).toThrow(/Expected tick 1/);
    expect(() => b.step({ tick: 1, commands: { A1: emptyCommand() } })).toThrow(/missing command/);
    expect(b.getSnapshot().tick).toBe(0);
  });
});
describe('kinematic movement', () => {
  it('accelerates, brakes, and stays inside arena bounds', () => {
    const b = createBattle({ setup, content });
    for (let t = 1; t <= 240; t++) b.step(frame(t, { A1: { moveX: 1 } }));
    expect(b.getSnapshot().combatants[0]!.x).toBeLessThanOrEqual(15.25);
    for (let t = 241; t <= 260; t++) b.step(frame(t));
    expect(b.getSnapshot().combatants[0]!.vx).toBe(0);
  });
  it('passes upward through a one-way platform, lands on it, and drops through', () => {
    const b = createBattle({ setup, content });
    b.step(frame(1, { A1: { jumpPressed: true } }));
    let highest = 0;
    for (let t = 2; t <= 90; t++) {
      b.step(frame(t));
      highest = Math.max(highest, b.getSnapshot().combatants[0]!.y);
    }
    expect(highest).toBeGreaterThan(4);
    expect(b.getSnapshot().combatants[0]).toMatchObject({
      y: 4,
      grounded: true,
      groundPlatformId: 'left-gantry',
    });
    b.step(frame(91, { A1: { dropHeld: true } }));
    for (let t = 92; t <= 140; t++) b.step(frame(t));
    expect(b.getSnapshot().combatants[0]).toMatchObject({ y: 0, grounded: true });
  });
  it('detects dash from tick-based directional double taps, not held movement', () => {
    const b = createBattle({ setup, content });
    b.step(frame(1, { A1: { moveX: 1 } }));
    b.step(frame(2));
    b.step(frame(3, { A1: { moveX: 1 } }));
    expect(b.getSnapshot().combatants[0]!.dashTicks).toBeGreaterThan(0);
    expect(b.getSnapshot().combatants[0]!.vx).toBe(18);
    const held = runBattleScenario({
      maxTicks: 20,
      commandFrames: (s) => frame(s.tick + 1, { A1: { moveX: 1 } }),
    });
    expect(held.snapshot.combatants[0]!.dashTicks).toBe(0);
  });
  it('destroyed legs reduce run speed, jump height and dash speed', () => {
    const local = fixture((d) => {
      if (d.id === 'metabee-legs') d.armor = 1;
      if (d.kind === 'arena')
        d.spawns = [
          { x: -0.5, y: 0 },
          { x: -13, y: 0 },
          { x: 1.5, y: 0 },
          { x: 14, y: 0 },
        ];
    });
    const b = createBattle({ setup, content: local });
    for (let t = 1; t <= 30; t++) b.step(frame(t, { B1: { leftArmPressed: t === 1 } }));
    expect(b.getSnapshot().combatants[0]!.parts.legs.destroyed).toBe(true);
    for (let t = 31; t <= 60; t++) b.step(frame(t, { A1: { moveX: -1 } }));
    expect(Math.abs(b.getSnapshot().combatants[0]!.vx)).toBeCloseTo(7.3 * 0.4);
    b.step(frame(61, { A1: { jumpPressed: true } }));
    expect(b.getSnapshot().combatants[0]!.vy).toBeLessThan(10);
    b.step(frame(62, { A1: { moveX: -1 } }));
    b.step(frame(63));
    b.step(frame(64, { A1: { moveX: -1 } }));
    expect(Math.abs(b.getSnapshot().combatants[0]!.vx)).toBeCloseTo(18 * 0.45);
  });
});
describe('deterministic AI and random source', () => {
  it('repeats seeded random sequences and stays in [0,1)', () => {
    const series = (seed: number) =>
      Array.from({ length: 100 }, () => {
        const r = nextRandom(seed);
        seed = r.state;
        return r.value;
      });
    expect(series(12)).toEqual(series(12));
    expect(series(12)).not.toEqual(series(13));
    expect(series(12).every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('moves toward targets, jumps toward higher platforms, and respects reaction ticks', () => {
    const s = createBattle({ setup, content }).getSnapshot();
    const memory = createAIState(9);
    const cmd = aiCommand(s, 'B1', content, content.ai['ai-balanced']!, memory);
    expect(cmd.moveX).toBe(-1);
    s.tick = 1;
    expect(aiCommand(s, 'B1', content, content.ai['ai-balanced']!, memory).headPressed).toBe(false);
    s.tick = 50;
    s.combatants[0]!.y = 4;
    expect(aiCommand(s, 'B1', content, content.ai['ai-balanced']!, memory).jumpPressed).toBe(true);
  });
  it('cycles AI partner strategy through serializable commands', () => {
    const b = createBattle({ setup, content });
    b.step(frame(1, { A1: { strategyPressed: true } }));
    expect(b.getSnapshot().combatants[1]!.strategy).toBe('PROTECT_LEADER');
    b.step(frame(2, { A1: { strategyPressed: true } }));
    expect(b.getSnapshot().combatants[1]!.strategy).toBe('AGGRESSIVE');
  });
});

describe('limb armor protects the head', () => {
  it('breaks both arms and legs before any head damage, without overflow, then knocks out the leader', () => {
    const b = createBattle({ setup, content: closeArena(false, true) });
    const expected = ['rightArm', 'leftArm', 'legs', 'head', 'head'];
    for (let shot = 0; shot < 5; shot++) {
      for (let t = shot * 30 + 1; t <= (shot + 1) * 30 && !b.getResult(); t++)
        b.step(frame(t, { A1: { headPressed: t === shot * 30 + 1 } }));
      const target = b.getSnapshot().combatants[2]!;
      expect(target.parts.head.currentArmor, `shot ${shot + 1}`).toBe(
        shot < 3 ? 30 : shot === 3 ? 15 : 0,
      );
      const hit = b.drainEvents().find((e) => e.type === 'hit');
      expect(hit?.part).toBe(expected[shot]);
      if (shot < 4) expect(target.knockedOut).toBe(false);
    }
    expect(b.getResult()?.reason).toBe('leader-head-destroyed');
  });
  it('never spills excess helmet-hit damage through a destroyed limb into the head', () => {
    const c = fixture((d) => {
      if (d.kind === 'part' && d.slot !== 'head') d.armor = 1;
      if (d.kind === 'ability') {
        d.knockbackX = 0;
        d.knockbackY = 0;
      }
      if (d.kind === 'arena')
        d.spawns = [
          { x: -2, y: 0 },
          { x: -13, y: 0 },
          { x: 2, y: 0 },
          { x: 14, y: 0 },
        ];
    });
    const run = runBattleScenario({ content: c, maxTicks: 90, commandFrames: shootHead });
    const target = run.snapshot.combatants[2]!;
    expect(
      ['rightArm', 'leftArm', 'legs'].every(
        (s) => target.parts[s as keyof typeof target.parts].destroyed,
      ),
    ).toBe(true);
    expect(target.parts.head.currentArmor).toBe(600);
    expect(run.events.filter((e) => e.type === 'hit').map((e) => e.damage)).toEqual([1, 1, 1]);
  });
});
