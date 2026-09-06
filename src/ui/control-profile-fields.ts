import {
  INPUT_ACTIONS,
  type InputAction,
  type KeyboardDefinition,
  type GamepadDefinition,
} from '../content/schemas';
import { keyLabel } from '../input/bindings';
import { element, button } from './dom';

export const ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: 'Move left',
  moveRight: 'Move right',
  aimUp: 'Up',
  dropThroughPlatform: 'Down',
  jump: 'Jump',
  rightArm: 'Attack',
  leftArm: 'Left-arm shortcut',
  head: 'Head shortcut',
  guard: 'Guard',
  chargeSpecial: 'Unused',
  activateSpecial: 'Medaforce',
  partnerStrategy: 'Partner orders',
  pause: 'Pause',
};
const PAD_LABELS: Record<number, string> = {
  0: 'A',
  1: 'B',
  4: 'LB',
  5: 'RB',
  8: 'Select',
  9: 'Start',
  12: '↑',
  13: '↓',
  14: '←',
  15: '→',
};

/** A spatial control guide first; optional remapping details stay collapsed. */
export function createControlProfileFields(
  profile: KeyboardDefinition | GamepadDefinition,
  onChange: (profile: KeyboardDefinition | GamepadDefinition) => void,
  onCapture: (action: InputAction, append: boolean) => void,
) {
  const guide = element('div', 'control-guide');
  const label = (action: InputAction) =>
    profile.kind === 'keyboard'
      ? profile.bindings[action].map(keyLabel).join(' / ') || '—'
      : profile.bindings[action].map((index) => PAD_LABELS[index] ?? String(index)).join(' / ') ||
        '—';
  const key = (action: InputAction) => {
    if (profile.kind === 'gamepad') {
      return element('kbd', 'guide-key pad-key', label(action));
    }
    const keyButton = button(
      label(action),
      () => onCapture(action, false),
      'guide-key binding-key',
    );
    keyButton.dataset.action = action;
    keyButton.setAttribute('aria-label', `Rebind ${ACTION_LABELS[action]}`);
    return keyButton;
  };
  const basic = element('div', 'basic-controls');
  const movement = element('section', 'movement-guide');
  movement.append(element('h3', '', 'Move'));
  const pad = element('div', 'direction-pad');
  for (const action of ['aimUp', 'moveLeft', 'moveRight', 'dropThroughPlatform'] as const) {
    const cap = key(action);
    cap.dataset.direction = action;
    pad.append(cap);
  }
  movement.append(
    pad,
    element(
      'p',
      '',
      profile.kind === 'gamepad'
        ? 'Left stick or D-pad · tap twice to dash'
        : 'Tap a direction twice to dash',
    ),
  );
  const actions = element('div', 'action-guide');
  for (const [action, hint] of [
    ['jump', 'Hold for a higher jump'],
    ['rightArm', 'Right-arm weapon'],
    ['guard', 'Hold to protect parts'],
    ['activateSpecial', 'When the meter is full'],
    ['partnerStrategy', 'Cycle your partner’s order'],
    ['pause', 'Pause or resume'],
  ] as const) {
    const card = element('div', 'action-key-card');
    const text = element('div');
    text.append(element('strong', '', ACTION_LABELS[action]), element('span', '', hint));
    card.append(key(action), text);
    actions.append(card);
  }
  basic.append(movement, actions);
  guide.append(basic);
  const combos = element('div', 'combo-guide');
  for (const [modifier, action, title] of [
    ['aimUp', 'rightArm', 'Head weapon'],
    ['dropThroughPlatform', 'rightArm', 'Left-arm weapon'],
    ['dropThroughPlatform', 'jump', 'Drop through'],
  ] as const) {
    const row = element('div');
    const keys = element('span', 'combo-keys');
    keys.append(
      element('kbd', '', label(modifier)),
      element('span', '', '+'),
      element('kbd', '', label(action)),
    );
    row.append(keys, element('strong', '', title));
    combos.append(row);
  }
  guide.append(combos);

  const advanced = element('details', 'advanced-controls');
  advanced.append(
    element(
      'summary',
      '',
      profile.kind === 'keyboard' ? 'Extra keys & shortcuts' : 'Controller mapping',
    ),
  );
  if (profile.kind === 'gamepad') {
    advanced.append(
      element(
        'p',
        '',
        'Standard controller labels are shown above. Edit button numbers below for a different layout.',
      ),
    );
    const axes = element('div', 'axis-settings');
    for (const [name, title, min, max, step] of [
      ['axisIndex', 'Horizontal axis', 0, 15, 1],
      ['verticalAxisIndex', 'Vertical axis', 0, 15, 1],
      ['deadzone', 'Stick deadzone', 0, 0.9, 0.01],
      ['activationThreshold', 'Stick threshold', 0.1, 1, 0.01],
    ] as const) {
      const field = element('label', '', title);
      const input = element('input');
      input.type = 'number';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(profile[name]);
      input.setAttribute('aria-label', title);
      input.onchange = () => {
        const next = structuredClone(profile);
        next[name] = Number(input.value);
        onChange(next);
      };
      field.append(input);
      axes.append(field);
    }
    advanced.append(axes);
  }
  for (const action of INPUT_ACTIONS.filter((action) => action !== 'chargeSpecial')) {
    const row = element('div', 'extra-binding');
    row.append(element('span', '', ACTION_LABELS[action]));
    if (profile.kind === 'keyboard') {
      const change = button(label(action), () => onCapture(action, false), 'extra-key');
      change.setAttribute('aria-label', `Change extra ${ACTION_LABELS[action]}`);
      const add = button('+', () => onCapture(action, true), 'extra-key');
      add.setAttribute('aria-label', `Add alternative for ${ACTION_LABELS[action]}`);
      row.append(change, add);
    } else {
      const input = element('input');
      input.value = profile.bindings[action].join(', ');
      input.setAttribute('aria-label', `${ACTION_LABELS[action]} buttons`);
      input.onchange = () => {
        const next = structuredClone(profile);
        next.bindings[action] = input.value
          .split(',')
          .filter((value) => value.trim())
          .map(Number);
        onChange(next);
      };
      row.append(input);
    }
    advanced.append(row);
  }
  guide.append(advanced);
  return guide;
}
