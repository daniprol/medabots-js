import {
  Actions,
  type InputAction,
  type KeyboardDefinition,
  type GamepadDefinition,
} from '../content/schemas';
import type { CombatantCommand } from '../battle-core';
export type ActionState = Record<InputAction, boolean>;
export const emptyActions = (): ActionState =>
  Object.fromEntries(Actions.map((a) => [a, false])) as ActionState;
export function normalizeActions(held: ActionState, pressed: ActionState): CombatantCommand {
  return {
    moveX: held.moveLeft === held.moveRight ? 0 : held.moveLeft ? -1 : 1,
    jumpPressed: pressed.jump,
    dropHeld: held.dropThroughPlatform,
    rightArmPressed: pressed.rightArm,
    leftArmPressed: pressed.leftArm,
    headPressed: pressed.head,
    guardHeld: held.guard,
    chargeHeld: held.chargeSpecial,
    specialPressed: pressed.activateSpecial,
    strategyPressed: pressed.partnerStrategy,
  };
}
export function keyboardConflicts(profiles: KeyboardDefinition[]): string[] {
  const owners = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const p of profiles)
    for (const code of new Set(Object.values(p.bindings).flat())) {
      const prev = owners.get(code);
      if (prev && prev !== p.id) conflicts.add(`${code}: ${prev} / ${p.id}`);
      owners.set(code, p.id);
    }
  return [...conflicts];
}
export type LocalControllerAssignment =
  | { type: 'ai'; aiProfileId: string }
  | { type: 'keyboard'; profileId: string }
  | { type: 'gamepad'; gamepadIndex: number; profileId: string };
export type Assignments = Record<string, LocalControllerAssignment>;
export function assignmentErrors(assignments: Assignments): string[] {
  const used = new Set<string>();
  const errors: string[] = [];
  for (const a of Object.values(assignments)) {
    if (a.type === 'ai') continue;
    const key = a.type === 'keyboard' ? `keyboard:${a.profileId}` : `gamepad:${a.gamepadIndex}`;
    if (used.has(key)) errors.push(`${key} is assigned more than once`);
    used.add(key);
  }
  return errors;
}
export type GamepadLike = {
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
};
export function mapGamepad(pad: GamepadLike, profile: GamepadDefinition): ActionState {
  const state = emptyActions();
  for (const action of Actions)
    state[action] = profile.bindings[action].some(
      (i) => pad.buttons[i]?.pressed || (pad.buttons[i]?.value ?? 0) > 0.5,
    );
  const raw = pad.axes[profile.axisIndex] ?? 0;
  const axis = Math.abs(raw) < profile.deadzone ? 0 : raw;
  state.moveLeft ||= axis <= -profile.activationThreshold;
  state.moveRight ||= axis >= profile.activationThreshold;
  return state;
}
export const keyLabel = (code: string) =>
  code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Arrow', '')
    .replace('Numpad', 'Num ')
    .replace('Escape', 'Esc');
