import {
  INPUT_ACTIONS,
  type InputAction,
  type KeyboardDefinition,
  type GamepadDefinition,
} from '../content/schemas';
import { keyLabel } from '../input/bindings';
import { element, button } from './dom';

const ACTION_LABELS: Record<InputAction, string> = {
  moveLeft: 'Move left',
  moveRight: 'Move right',
  jump: 'Jump',
  dropThroughPlatform: 'Drop through platform',
  rightArm: 'Right arm / Primary',
  leftArm: 'Left arm / Secondary',
  head: 'Head weapon',
  guard: 'Guard (hold)',
  chargeSpecial: 'Charge Medaforce (hold)',
  activateSpecial: 'Activate special',
  partnerStrategy: 'Partner strategy',
  pause: 'Pause / Resume',
};

/** Render one profile's editable fields. The dialog owns validation and keyboard capture. */
export function createControlProfileFields(
  profile: KeyboardDefinition | GamepadDefinition,
  onChange: (profile: KeyboardDefinition | GamepadDefinition) => void,
  onCapture: (action: InputAction, append: boolean) => void,
) {
  const editor = element('div');

  if (profile.kind === 'gamepad') {
    const axes = element('div', 'axis-settings');

    for (const [key, label, min, max, step] of [
      ['axisIndex', 'Horizontal axis', 0, 15, 1],
      ['deadzone', 'Deadzone', 0, 0.9, 0.01],
      ['activationThreshold', 'Activation', 0.1, 1, 0.01],
    ] as const) {
      const field = element('label', '', label);
      const input = element('input');
      input.type = 'number';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(profile[key]);
      input.setAttribute('aria-label', label);
      input.onchange = () => {
        const next = structuredClone(profile);
        next[key] = Number(input.value);
        onChange(next);
      };
      field.append(input);
      axes.append(field);
    }

    editor.append(axes);
  }

  const rows = element('div', 'binding-rows');

  for (const action of INPUT_ACTIONS) {
    const row = element('div', 'binding-row');
    row.append(element('span', '', ACTION_LABELS[action]));

    if (profile.kind === 'keyboard') {
      const keys = button(
        profile.bindings[action].map(keyLabel).join(' / '),
        () => onCapture(action, false),
        'binding-key',
      );
      keys.dataset.action = action;
      keys.setAttribute('aria-label', `Rebind ${ACTION_LABELS[action]}`);

      const add = button('+', () => onCapture(action, true), 'add-binding');
      add.setAttribute('aria-label', `Add alternative for ${ACTION_LABELS[action]}`);
      row.append(keys, add);
    } else {
      const input = element('input', 'button-indices');
      input.value = profile.bindings[action].join(', ');
      input.setAttribute('aria-label', `${ACTION_LABELS[action]} buttons`);
      input.onchange = () => {
        const next = structuredClone(profile);
        next.bindings[action] = input.value
          .split(',')
          .map((v) => (v.trim() === '' ? NaN : Number(v.trim())));
        onChange(next);
      };
      row.append(input);
    }

    rows.append(row);
  }

  editor.append(rows);

  return editor;
}
