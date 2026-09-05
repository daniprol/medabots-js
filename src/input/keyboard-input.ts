import { Actions, type KeyboardDefinition } from '../content/schemas';
import { emptyActions } from './bindings';
/** Edge latches survive keyup and remain available to every profile until endTick. */
export class KeyboardInput {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private active = new Set<string>();
  constructor(private target: Window = window) {
    target.addEventListener('keydown', this.down);
    target.addEventListener('keyup', this.up);
    target.addEventListener('blur', this.clear);
  }
  private down = (event: KeyboardEvent) => {
    if (this.active.has(event.code)) {
      event.preventDefault();
      if (!event.repeat && !this.held.has(event.code)) this.pressed.add(event.code);
      this.held.add(event.code);
    }
  };
  private up = (event: KeyboardEvent) => {
    if (this.active.has(event.code)) event.preventDefault();
    this.held.delete(event.code);
  };
  setProfiles(profiles: KeyboardDefinition[]) {
    this.active = new Set(profiles.flatMap((p) => Object.values(p.bindings).flat()));
    this.clear();
  }
  read(profile: KeyboardDefinition) {
    const held = emptyActions(),
      pressed = emptyActions();
    for (const action of Actions) {
      held[action] = profile.bindings[action].some((k) => this.held.has(k));
      pressed[action] = profile.bindings[action].some((k) => this.pressed.has(k));
    }
    return { held, pressed };
  }
  endTick() {
    this.pressed.clear();
  }
  clear = () => {
    this.held.clear();
    this.pressed.clear();
  };
  dispose() {
    this.target.removeEventListener('keydown', this.down);
    this.target.removeEventListener('keyup', this.up);
    this.target.removeEventListener('blur', this.clear);
  }
}
