import { Actions, type GamepadDefinition } from '../content/schemas';
import { emptyActions, mapGamepad, type ActionState } from './bindings';
export class GamepadInput {
  private states = new Map<number, { held: ActionState; pressed: ActionState }>();
  poll(assignments: { index: number; profile: GamepadDefinition }[]): number[] {
    const pads = navigator.getGamepads?.() ?? [];
    const missing: number[] = [];
    for (const { index, profile } of assignments) {
      const pad = pads[index];
      if (!pad?.connected) {
        missing.push(index);
        this.states.delete(index);
        continue;
      }
      const held = mapGamepad(pad, profile);
      const prior = this.states.get(index) ?? { held: emptyActions(), pressed: emptyActions() };
      const pressed = prior.pressed;
      for (const a of Actions) pressed[a] ||= held[a] && !prior.held[a];
      this.states.set(index, { held, pressed });
    }
    return missing;
  }
  read(index: number) {
    return this.states.get(index) ?? { held: emptyActions(), pressed: emptyActions() };
  }
  endTick() {
    for (const s of this.states.values()) s.pressed = emptyActions();
  }
  clear() {
    this.endTick();
  }
}
export function connectedGamepads() {
  return Array.from(navigator.getGamepads?.() ?? []).filter(
    (p): p is Gamepad => p !== null && p.connected,
  );
}
