import { describe, it, expect } from 'vitest';

import { createBattle } from '../src/battle-core';
import { replaceControlProfile } from '../src/ui/control-settings';
import {
  presetAssignments,
  setupErrors,
  selectCharacter,
  characterStats,
} from '../src/ui/setup-state';
import { content, setup } from './helpers';

describe('roster and control configuration', () => {
  it('defaults to arrows and F/G for a solo player, with AI partners and opponents', () => {
    const a = presetAssignments('solo');
    expect(a.A1).toEqual({ type: 'keyboard', profileId: 'keyboard-solo' });
    expect(Object.values(a).filter((a) => a.type === 'ai')).toHaveLength(3);
    const p = content.keyboards['keyboard-solo']!;
    expect(p.bindings.moveLeft).toEqual(['ArrowLeft']);
    expect(p.bindings.rightArm).toEqual(['KeyF']);
    expect(p.bindings.jump).toEqual(['KeyG']);
  });
  it('puts two shared-keyboard humans on opposing teams, with a conflict-free three-player option', () => {
    const a = presetAssignments('shared-two');
    expect(a.A1).toMatchObject({ profileId: 'keyboard-1' });
    expect(a.B1).toMatchObject({ profileId: 'keyboard-2' });
    expect(setupErrors(a, content, [])).toEqual([]);
    expect(setupErrors(presetAssignments('shared-three'), content, [])).toEqual([]);
  });
  it('assigns distinct pads, warns on disconnect, and rejects overlapping keyboard layouts', () => {
    const a = presetAssignments('gamepads', [0, 2, 3, 4]);
    expect(Object.values(a).filter((a) => a.type === 'gamepad')).toHaveLength(4);
    expect(setupErrors(a, content, [0, 2, 3, 4])).toEqual([]);
    expect(setupErrors(a, content, [0, 2, 3])).toContain(
      'Reconnect gamepad 5 or assign another controller.',
    );
    const shared = presetAssignments('solo');
    shared.B1 = { type: 'keyboard', profileId: 'keyboard-2' };
    expect(setupErrors(shared, content, []).some((e) => e.startsWith('Shared key:'))).toBe(true);
  });
  it('selects a character with its own loadout and truthful stats without mutating setup', () => {
    const initial = structuredClone(setup);
    initial.teams[0]!.combatants[0]!.loadout = content.characters.metabee!.defaultLoadout;
    const changed = selectCharacter(initial, 'A1', 'arcbeetle', content);
    expect(initial.teams[0]!.combatants[0]!.characterId).toBe('metabee');
    const c = createBattle({ setup: changed, content }).getSnapshot().combatants[0]!;
    expect(c.characterId).toBe('arcbeetle');
    expect(c.parts.head.definitionId).toBe('arcbeetle-head');
    expect(characterStats('arcbeetle', content).armor).toBe(
      Object.values(c.parts).reduce((n, p) => n + p.maxArmor, 0),
    );
  });
  it('rebinds session controls without modifying JSONC defaults and rejects invalid/conflicting codes', () => {
    const p = structuredClone(content.keyboards['keyboard-solo']!);
    p.bindings.rightArm = ['KeyZ'];
    const next = replaceControlProfile(content, p);
    expect(next.keyboards[p.id]!.bindings.rightArm).toEqual(['KeyZ']);
    expect(content.keyboards[p.id]!.bindings.rightArm).toEqual(['KeyF']);
    p.bindings.rightArm = ['ArrowLeft'];
    expect(() => replaceControlProfile(content, p)).toThrow(/already assigned/);
    p.bindings.rightArm = ['NotAKey'];
    expect(() => replaceControlProfile(content, p)).toThrow(/bindings\/rightArm/);
  });
  it('validates edited gamepad indices and axis thresholds', () => {
    const p = structuredClone(content.gamepads['standard-gamepad']!);
    p.bindings.jump = [40];
    expect(() => replaceControlProfile(content, p)).toThrow(/bindings\/jump/);
    p.bindings.jump = [1];
    p.deadzone = 0.8;
    p.activationThreshold = 0.4;
    expect(() => replaceControlProfile(content, p)).toThrow(/greater than its deadzone/);
    p.deadzone = 0.2;
    expect(replaceControlProfile(content, p).gamepads[p.id]!.bindings.jump).toEqual([1]);
  });
});
