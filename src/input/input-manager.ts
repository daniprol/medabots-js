import type { ContentCatalog } from '../content/build-content-catalog';
import { KeyboardInput } from './keyboard-input';
import { GamepadInput } from './gamepad-input';
import { normalizeActions, assignmentErrors, type Assignments } from './bindings';
export class InputManager {
  readonly keyboard = new KeyboardInput();
  readonly gamepad = new GamepadInput();
  constructor(
    readonly assignments: Assignments,
    private content: ContentCatalog,
  ) {
    const errors = assignmentErrors(assignments);
    if (errors.length) throw new Error(errors.join('\n'));
    this.keyboard.setProfiles(
      Object.values(assignments).flatMap((a) =>
        a.type === 'keyboard' ? [content.keyboards[a.profileId]!] : [],
      ),
    );
  }
  poll() {
    return this.gamepad.poll(
      Object.values(this.assignments).flatMap((a) =>
        a.type === 'gamepad'
          ? [{ index: a.gamepadIndex, profile: this.content.gamepads[a.profileId]! }]
          : [],
      ),
    );
  }
  read(id: string) {
    const a = this.assignments[id]!;
    if (a.type === 'ai') return null;
    const state =
      a.type === 'keyboard'
        ? this.keyboard.read(this.content.keyboards[a.profileId]!)
        : this.gamepad.read(a.gamepadIndex);
    return { command: normalizeActions(state.held, state.pressed), pause: state.pressed.pause };
  }
  endTick() {
    this.keyboard.endTick();
    this.gamepad.endTick();
  }
  clear() {
    this.keyboard.clear();
    this.gamepad.clear();
  }
  dispose() {
    this.keyboard.dispose();
    this.gamepad.clear();
  }
}
