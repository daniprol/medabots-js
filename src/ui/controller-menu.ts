import type { ContentCatalog } from '../content/catalog';
import {
  type InputAction,
  type KeyboardDefinition,
  type GamepadDefinition,
} from '../content/schemas';
import { type Assignments, keyLabel } from '../input/bindings';
import { connectedGamepads } from '../input/gamepad-input';
import { createControlProfileFields } from './control-profile-fields';
import { replaceControlProfile } from './control-settings';
import { element, button } from './dom';
import { presetAssignments, setupErrors, type SetupPreset } from './setup-state';

function controllerValue(assignment: Assignments[string]): string {
  if (assignment.type === 'ai') {
    return 'ai';
  }

  if (assignment.type === 'keyboard') {
    return assignment.profileId;
  }

  return `pad:${assignment.gamepadIndex}`;
}

export function createControllerMenu(
  root: HTMLElement,
  content: ContentCatalog,
  defaults: ContentCatalog,
  assigned: Assignments,
  onApply: (assignments: Assignments, content: ContentCatalog) => void,
) {
  let draftContent = content;
  let assignments = structuredClone(assigned);
  let mode: 'keyboard' | 'gamepad' = 'keyboard';
  let profileId = assigned.A1?.type === 'keyboard' ? assigned.A1.profileId : 'keyboard-solo';
  let capture: { action: InputAction; append: boolean } | null = null;
  let error = '';
  let disposed = false;
  const dialog = element('dialog', 'controller-dialog');
  dialog.setAttribute('aria-labelledby', 'controls-title');

  const header = element('header', 'controls-header');
  const titles = element('div');
  titles.append(element('span', 'eyebrow', 'LOCAL MULTIPLAYER / INPUT SETUP'));

  const title = element('h2', '', 'CONTROLS & PLAYERS');
  title.id = 'controls-title';
  titles.append(title);
  header.append(
    titles,
    button('×', () => close(), 'dialog-close'),
  );
  header.lastElementChild!.setAttribute('aria-label', 'Close controls');
  dialog.append(header);

  const presets = element('div', 'input-presets');
  presets.append(element('span', '', 'QUICK LAYOUTS'));

  for (const [id, label] of [
    ['solo', 'Solo · arrows + F/G'],
    ['shared-two', '2 players · one keyboard'],
    ['shared-three', '3 players · one keyboard'],
    ['gamepads', 'Use connected gamepads'],
  ] as [SetupPreset, string][]) {
    presets.append(
      button(
        label,
        () => {
          const pads = connectedGamepads();

          if (id === 'gamepads' && !pads.length) {
            error = 'Connect a controller and press a button first.';
            updateStatus();

            return;
          }

          assignments = presetAssignments(
            id,
            pads.map((p) => p.index),
          );
          profileId =
            id === 'solo' ? 'keyboard-solo' : id === 'gamepads' ? 'standard-gamepad' : 'keyboard-1';
          mode = id === 'gamepads' ? 'gamepad' : 'keyboard';
          error = '';
          renderAssignments();
          renderEditor();
        },
        'preset-button',
      ),
    );
  }

  dialog.append(presets);

  const columns = element('div', 'controls-columns');
  const left = element('section', 'device-panel');
  const right = element('section', 'binding-panel');
  columns.append(left, right);
  dialog.append(columns);
  left.append(
    element('h3', '', 'WHO IS PLAYING?'),
    element('p', 'muted', 'Assign an input to each slot. CPU fills the rest.'),
  );

  const assignmentRows = element('div', 'device-assignments');
  left.append(assignmentRows);

  const deviceStatus = element('div', 'connected-devices');
  deviceStatus.setAttribute('aria-live', 'polite');
  left.append(
    deviceStatus,
    element(
      'p',
      'device-help',
      'Connect USB or Bluetooth, then press any controller button. Shared-keyboard presets use different keys for each player. Some keyboards cannot register every combination at once.',
    ),
  );

  const tabs = element('div', 'control-tabs');

  for (const [id, label] of [
    ['keyboard', 'Keyboard'],
    ['gamepad', 'Gamepad'],
  ] as const) {
    const b = button(
      label,
      () => {
        mode = id;
        profileId = id === 'keyboard' ? 'keyboard-solo' : 'standard-gamepad';
        capture = null;
        error = '';
        renderEditor();
      },
      'tab-button',
    );
    b.dataset.mode = id;
    tabs.append(b);
  }

  right.append(tabs);

  const editor = element('div', 'profile-editor');
  right.append(editor);

  const tester = element('div', 'input-tester', 'INPUT CHECK · Press a key or controller button');
  right.append(tester);

  const footer = element('footer', 'controls-footer');
  const status = element('p', 'controls-validation');
  status.setAttribute('aria-live', 'polite');

  const apply = button(
    'APPLY CONTROLS  ↗',
    () => {
      if (
        error ||
        setupErrors(
          assignments,
          draftContent,
          connectedGamepads().map((p) => p.index),
        ).length
      ) {
        return;
      }

      onApply(structuredClone(assignments), draftContent);
      close();
    },
    'button primary',
  );
  footer.append(
    status,
    button('CANCEL', () => close(), 'button ghost'),
    apply,
  );
  dialog.append(footer);

  function renderAssignments() {
    assignmentRows.replaceChildren();

    for (const [id, a] of Object.entries(assignments)) {
      const row = element('label', 'device-row');
      row.append(
        element('strong', id.startsWith('A') ? 'cyan' : 'coral', id),
        element('span', '', id.endsWith('1') ? 'LEADER' : 'PARTNER'),
      );

      const select = element('select');
      select.setAttribute('aria-label', `${id} controller`);

      const choices: [string, string][] = [
        ['ai', 'CPU · AI'],
        ...Object.values(draftContent.keyboards).map(
          (p) => [p.id, p.displayName] as [string, string],
        ),
        ...connectedGamepads().map(
          (p) =>
            [`pad:${p.index}`, `Gamepad ${p.index + 1} · ${p.id.slice(0, 22)}`] as [string, string],
        ),
      ];
      const value = controllerValue(a);

      if (!choices.some(([v]) => v === value)) {
        choices.push([value, 'Disconnected controller']);
      }

      for (const [v, label] of choices) {
        const option = element('option', '', label);
        option.value = v;
        option.disabled =
          v !== 'ai' &&
          Object.entries(assignments).some(
            ([other, input]) => other !== id && controllerValue(input) === v,
          );
        select.append(option);
      }

      select.value = value;
      select.onchange = () => {
        assignments[id] =
          select.value === 'ai'
            ? { type: 'ai', aiProfileId: 'ai-balanced' }
            : select.value.startsWith('pad:')
              ? {
                  type: 'gamepad',
                  gamepadIndex: Number(select.value.slice(4)),
                  profileId: 'standard-gamepad',
                }
              : { type: 'keyboard', profileId: select.value };
        error = '';
        renderAssignments();
        updateStatus();
      };
      row.append(select);
      assignmentRows.append(row);
    }

    updateStatus();
  }

  function updateStatus() {
    const pads = connectedGamepads();
    const issues = setupErrors(
      assignments,
      draftContent,
      pads.map((p) => p.index),
    );
    status.textContent =
      error || issues[0] || 'Ready. Changes apply to this session; JSONC presets stay unchanged.';
    status.classList.toggle('invalid', !!error || issues.length > 0);
    apply.disabled = !!error || issues.length > 0 || !!capture;
    deviceStatus.textContent = pads.length
      ? pads.map((p) => `● Gamepad ${p.index + 1} connected`).join(' · ')
      : '○ No gamepads detected';
  }

  function save(profile: KeyboardDefinition | GamepadDefinition) {
    try {
      draftContent = replaceControlProfile(draftContent, profile);
      error = '';
    } catch (e) {
      error = (e as Error).message;
    }

    updateStatus();
  }

  function renderEditor() {
    capture = null;

    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('button')) {
      tab.classList.toggle('active', tab.dataset.mode === mode);
      tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode));
    }

    editor.replaceChildren();

    const profiles = mode === 'keyboard' ? draftContent.keyboards : draftContent.gamepads;
    const profile = profiles[profileId]!;
    const top = element('div', 'profile-picker');
    const select = element('select');
    select.setAttribute('aria-label', 'Control profile');

    for (const p of Object.values(profiles)) {
      const o = element('option', '', p.displayName);
      o.value = p.id;
      select.append(o);
    }

    select.value = profileId;
    select.onchange = () => {
      profileId = select.value;
      error = '';
      renderEditor();
    };
    top.append(
      select,
      button(
        'RESET',
        () => {
          const original =
            mode === 'keyboard' ? defaults.keyboards[profileId]! : defaults.gamepads[profileId]!;
          save(original);
          renderEditor();
        },
        'reset-profile',
      ),
    );
    editor.append(top);
    editor.append(
      element(
        'p',
        'binding-instructions',
        mode === 'keyboard'
          ? 'Click a key to replace it, or + for an alternative. Escape cancels. Scroll for all 12 actions.'
          : 'Button indices start at 0. Press a controller button to test its index. Scroll for all 12 actions.',
      ),
    );
    editor.append(
      createControlProfileFields(
        profile,
        (next) => {
          save(next);
          renderEditor();
        },
        listen,
      ),
    );
    updateStatus();
  }

  function listen(action: InputAction, append: boolean) {
    capture = { action, append };
    error = '';
    renderCapture();
    updateStatus();
  }

  function renderCapture() {
    for (const b of editor.querySelectorAll<HTMLButtonElement>('.binding-key')) {
      const active = b.dataset.action === capture?.action;
      b.classList.toggle('listening', active);
      b.textContent = active
        ? 'PRESS A KEY…'
        : draftContent.keyboards[profileId]!.bindings[b.dataset.action as InputAction].map(
            keyLabel,
          ).join(' / ');
    }
  }

  const keydown = (e: KeyboardEvent) => {
    if (!dialog.open) {
      return;
    }

    if (capture) {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (e.code === 'Escape') {
        capture = null;
        renderCapture();
        updateStatus();

        return;
      }

      if (e.repeat) {
        return;
      }

      const next = structuredClone(draftContent.keyboards[profileId]!);
      next.bindings[capture.action] = capture.append
        ? [...new Set([...next.bindings[capture.action], e.code])]
        : [e.code];
      capture = null;
      save(next);
      renderCapture();
    } else if (
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLSelectElement)
    ) {
      tester.textContent = `KEYBOARD INPUT · ${keyLabel(e.code)}`;
    }
  };

  function close() {
    if (disposed) {
      return;
    }

    disposed = true;
    clearInterval(interval);
    window.removeEventListener('keydown', keydown, true);
    dialog.close();
    dialog.remove();
  }
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();

    if (capture) {
      capture = null;
      renderCapture();
      updateStatus();
    } else {
      close();
    }
  });
  root.append(dialog);
  renderAssignments();
  renderEditor();
  dialog.showModal();
  window.addEventListener('keydown', keydown, true);

  let signature = '';
  const interval = window.setInterval(() => {
    const pads = connectedGamepads();
    const next = pads.map((p) => `${p.index}:${p.id}`).join('|');

    if (next !== signature) {
      signature = next;
      renderAssignments();
    }

    for (const p of pads) {
      const pressed = p.buttons.flatMap((b, i) => (b.pressed ? [i] : []));

      if (pressed.length) {
        tester.textContent = `GAMEPAD ${p.index + 1} · BUTTON ${pressed.join(' + ')}`;
      }
    }
  }, 150);

  return { dispose: close };
}
