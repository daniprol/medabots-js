import { describe, it, expect } from 'vitest';

import {
  emptyActions,
  normalizeActions,
  keyboardConflicts,
  assignmentErrors,
  mapGamepad,
  type Assignments,
} from '../src/input/bindings';
import { KeyboardInput } from '../src/input/keyboard-input';
import { content } from './helpers';
describe('input normalization and assignments', () => {
  it('uses the original B chords, gives Up priority, and preserves short chord edges', () => {
    const attack = { ...emptyActions(), rightArm: true };
    expect(normalizeActions(emptyActions(), attack)).toMatchObject({
      rightArmPressed: true,
      headPressed: false,
      leftArmPressed: false,
    });
    expect(
      normalizeActions({ ...emptyActions(), aimUp: true, dropThroughPlatform: true }, attack),
    ).toMatchObject({ headPressed: true, rightArmPressed: false, leftArmPressed: false });
    expect(
      normalizeActions(emptyActions(), { ...attack, dropThroughPlatform: true }),
    ).toMatchObject({ leftArmPressed: true, rightArmPressed: false });
    expect(normalizeActions(emptyActions(), { ...attack, aimUp: true })).toMatchObject({
      headPressed: true,
      rightArmPressed: false,
    });
    const mapped = mapGamepad(
      {
        axes: [0, -1],
        buttons: [
          { pressed: false, value: 0 },
          { pressed: true, value: 1 },
        ],
      },
      content.gamepads['standard-gamepad']!,
    );
    expect(normalizeActions(mapped, mapped).headPressed).toBe(true);
  });
  it('ships a solo layout and three mutually non-overlapping shared keyboard profiles', () => {
    expect(Object.keys(content.keyboards)).toHaveLength(4);
    expect(
      keyboardConflicts(Object.values(content.keyboards).filter((p) => p.id !== 'keyboard-solo')),
    ).toEqual([]);
  });
  it('warns on conflicting physical keys but supports multiple keys per action', () => {
    const p = structuredClone(content.keyboards['keyboard-2']!);
    p.bindings.jump = ['KeyW', 'ArrowUp'];
    expect(keyboardConflicts([content.keyboards['keyboard-1']!, p])).toContain(
      'KeyW: keyboard-1 / keyboard-2',
    );
  });
  it('prevents duplicate gamepads and keyboard profiles, while permitting mixed inputs and all-human matches', () => {
    const assignments: Assignments = {
      A1: { type: 'keyboard', profileId: 'keyboard-1' },
      A2: { type: 'keyboard', profileId: 'keyboard-2' },
      B1: { type: 'gamepad', gamepadIndex: 0, profileId: 'standard-gamepad' },
      B2: { type: 'gamepad', gamepadIndex: 1, profileId: 'standard-gamepad' },
    };
    expect(assignmentErrors(assignments)).toEqual([]);
    assignments.B2 = assignments.B1!;
    expect(assignmentErrors(assignments)).toHaveLength(1);
    assignments.A2 = assignments.A1!;
    expect(assignmentErrors(assignments)).toHaveLength(2);
  });
  it('distinguishes held actions from one-tick pressed actions', () => {
    const held = { ...emptyActions(), moveRight: true, guard: true, rightArm: true };
    const pressed = { ...emptyActions(), jump: true };
    expect(normalizeActions(held, pressed)).toMatchObject({
      moveX: 1,
      guardHeld: true,
      rightArmPressed: false,
      jumpPressed: true,
    });
    expect(normalizeActions({ ...held, moveLeft: true }, emptyActions()).moveX).toBe(0);
  });
  it('maps standard gamepad stick, d-pad, configurable button indices and thresholds', () => {
    const p = content.gamepads['standard-gamepad']!;
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    buttons[1]!.pressed = true;
    expect(mapGamepad({ axes: [0.65], buttons }, p)).toMatchObject({
      moveRight: true,
      rightArm: true,
      moveLeft: false,
    });
    expect(mapGamepad({ axes: [0.1], buttons }, p).moveRight).toBe(false);
    buttons[14]!.pressed = true;
    expect(mapGamepad({ axes: [0], buttons }, p).moveLeft).toBe(true);
    expect(mapGamepad({ axes: [], buttons: [] }, p)).toEqual(emptyActions());
  });
  it('latches short keyboard presses for a tick, supports simultaneous profiles, and clears on blur', () => {
    const target = new EventTarget();
    const input = new KeyboardInput(target as unknown as Window);
    const p1 = content.keyboards['keyboard-1']!,
      p2 = content.keyboards['keyboard-2']!;
    input.setProfiles([p1, p2]);
    const key = (type: string, code: string) => {
      const event = new Event(type, { cancelable: true });
      Object.defineProperty(event, 'code', { value: code });
      target.dispatchEvent(event);
      return event;
    };
    expect(key('keydown', 'KeyG').defaultPrevented).toBe(true);
    key('keyup', 'KeyG');
    key('keydown', 'KeyD');
    key('keydown', 'ArrowLeft');
    expect(input.read(p1)).toMatchObject({
      held: { jump: false, moveRight: true },
      pressed: { jump: true },
    });
    expect(input.read(p2).held.moveLeft).toBe(true);
    input.endTick();
    expect(input.read(p1).pressed.jump).toBe(false);
    target.dispatchEvent(new Event('blur'));
    expect(input.read(p1).held.moveRight).toBe(false);
    expect(input.read(p2).held.moveLeft).toBe(false);
    input.dispose();
  });
});
