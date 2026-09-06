import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { TICK_DURATION_SECONDS } from '../src/battle-core/timing';
import { LocalBattleSession } from '../src/battle-session/local-battle-session';
import type { Assignments } from '../src/input/bindings';
import { GamepadInput } from '../src/input/gamepad-input';
import { resizeTeams } from '../src/ui/setup-state';
import { content, setup } from './helpers';
const pad = (axis = 0) => ({
  connected: true,
  axes: [axis],
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
});
describe('local session controller lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('navigator', { getGamepads: () => [] });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('preserves gamepad edges across polls and does not retrigger held Start after pause/resume', () => {
    const p = pad();
    p.buttons[9]!.pressed = true;
    vi.stubGlobal('navigator', { getGamepads: () => [p] });
    const input = new GamepadInput();
    const profiles = [{ index: 0, profile: content.gamepads['standard-gamepad']! }];
    expect(input.poll(profiles)).toEqual([]);
    expect(input.read(0).pressed.pause).toBe(true);
    p.buttons[9]!.pressed = false;
    input.poll(profiles);
    expect(input.read(0).pressed.pause).toBe(true);
    input.endTick();
    p.buttons[9]!.pressed = true;
    input.poll(profiles);
    input.clear();
    input.poll(profiles);
    expect(input.read(0).pressed.pause).toBe(false);
    p.connected = false;
    expect(input.poll(profiles)).toEqual([0]);
  });
  it('supports two independent pads mixed with keyboard, then pauses on disconnect and resumes after reconnect', () => {
    const pads = [pad(1), pad(-1)];
    vi.stubGlobal('navigator', { getGamepads: () => pads });
    const assignments: Assignments = {
      A1: { type: 'keyboard', profileId: 'keyboard-1' },
      A2: { type: 'gamepad', gamepadIndex: 0, profileId: 'standard-gamepad' },
      B1: { type: 'gamepad', gamepadIndex: 1, profileId: 'standard-gamepad' },
      B2: { type: 'keyboard', profileId: 'keyboard-3' },
    };
    const session = new LocalBattleSession(setup, assignments, content);
    const key = new Event('keydown');
    Object.defineProperty(key, 'code', { value: 'KeyD' });
    window.dispatchEvent(key);
    for (let i = 0; i < 20; i++) {
      session.advance(TICK_DURATION_SECONDS);
    }
    expect(session.current.combatants.find((actor) => actor.id === 'A1')!.x).toBeGreaterThan(
      -18.375,
    );
    expect(session.current.combatants.find((actor) => actor.id === 'A2')!.x).toBeGreaterThan(-23.5);
    expect(session.current.combatants.find((actor) => actor.id === 'B1')!.x).toBeLessThan(18.375);
    expect(session.current.combatants.find((actor) => actor.id === 'B2')!.x).toBe(23.5);
    pads[0]!.connected = false;
    const tick = session.current.tick;
    session.advance(TICK_DURATION_SECONDS);
    expect(session.paused).toBe(true);
    expect(session.pauseReason).toContain('Controller 1 disconnected');
    session.resume();
    expect(session.paused).toBe(true);
    expect(session.current.tick).toBe(tick);
    pads[0]!.connected = true;
    session.resume();
    session.advance(TICK_DURATION_SECONDS);
    expect(session.current.tick).toBe(tick + 1);
    session.dispose();
  });
  it('defaults missing assignments to AI and clears keyboard state on focus loss', () => {
    const session = new LocalBattleSession(
      setup,
      { A1: { type: 'keyboard', profileId: 'keyboard-1' } },
      content,
    );
    expect(session.assignments.A2?.type).toBe('ai');
    const event = new Event('keydown');
    Object.defineProperty(event, 'code', { value: 'KeyD' });
    window.dispatchEvent(event);
    session.advance(TICK_DURATION_SECONDS);
    window.dispatchEvent(new Event('blur'));
    expect(session.paused).toBe(true);
    expect(session.pauseReason).toContain('focus');
    session.resume();
    for (let i = 0; i < 12; i++) {
      session.advance(TICK_DURATION_SECONDS);
    }
    expect(session.current.combatants[0]!.vx).toBe(0);
    session.dispose();
  });
  it('does not change the strategy of a human partner', () => {
    const session = new LocalBattleSession(
      setup,
      {
        A1: { type: 'keyboard', profileId: 'keyboard-1' },
        A2: { type: 'keyboard', profileId: 'keyboard-2' },
      },
      content,
    );
    const event = new Event('keydown');
    Object.defineProperty(event, 'code', { value: 'KeyT' });
    window.dispatchEvent(event);
    session.advance(TICK_DURATION_SECONDS);
    expect(session.current.combatants.find((actor) => actor.id === 'A2')!.panelIndex).toBe(3);
    session.dispose();
  });
  it('leader orders reach every AI partner and skip human teammates in a 3 vs 3 match', () => {
    const session = new LocalBattleSession(
      resizeTeams(setup, 3, content),
      {
        A1: { type: 'keyboard', profileId: 'keyboard-1' },
        A2: { type: 'keyboard', profileId: 'keyboard-2' },
      },
      content,
    );
    const press = (code: string) => {
      const event = new Event('keydown');
      Object.defineProperty(event, 'code', { value: code });
      window.dispatchEvent(event);
    };
    press('KeyO'); // Human partner's order key is ignored.
    press('KeyT'); // Leader orders the AI partner only.
    session.advance(TICK_DURATION_SECONDS);
    expect(session.current.combatants.find((actor) => actor.id === 'A2')!.panelIndex).toBe(3);
    expect(session.current.combatants.find((actor) => actor.id === 'A3')!.panelIndex).toBe(4);
    session.dispose();
  });
});
