import type { ContentCatalog } from '../content/catalog';
import type { InputAction, KeyboardDefinition, GamepadDefinition } from '../content/schemas';
import { type Assignments, keyLabel } from '../input/bindings';
import { connectedGamepads } from '../input/gamepad-input';
import { ACTION_LABELS, createControlProfileFields } from './control-profile-fields';
import { replaceControlProfile } from './control-settings';
import { controllerAssignment } from './controller-assignment';
import { element, button } from './dom';
import { presetAssignments, setupErrors, type SetupPreset } from './setup-state';

export function createControllerMenu(
  root: HTMLElement,
  content: ContentCatalog,
  defaults: ContentCatalog,
  assigned: Assignments,
  onApply: (assignments: Assignments, content: ContentCatalog) => void,
) {
  let draftContent = content;
  let assignments = structuredClone(assigned);
  let profileId = assigned.A1?.type === 'keyboard' ? assigned.A1.profileId : 'keyboard-solo';
  let capture: { action: InputAction; append: boolean } | null = null;
  let error = '';
  let disposed = false;
  const dialog = element('dialog', 'controls-menu');
  dialog.setAttribute('aria-labelledby', 'controls-title');
  const header = element('header', 'controls-menu-header');
  const title = element('h2', '', 'Controls');
  title.id = 'controls-title';
  const closeButton = button('×', close, 'menu-close');
  closeButton.setAttribute('aria-label', 'Close controls');
  header.append(title, closeButton);
  dialog.append(header);
  const tabs = element('div', 'menu-tabs');
  const guidePanel = element('section', 'keys-page');
  const playerPanel = element('section', 'players-page');
  playerPanel.hidden = true;
  for (const [panel, name] of [
    [guidePanel, 'How to play'],
    [playerPanel, 'Players'],
  ] as const) {
    const tab = button(
      name,
      () => {
        capture = null;
        guidePanel.hidden = panel !== guidePanel;
        playerPanel.hidden = panel !== playerPanel;
        for (const child of tabs.querySelectorAll('button')) {
          child.setAttribute('aria-pressed', String(child === tab));
        }
        renderEditor();
      },
      'menu-tab',
    );
    tab.setAttribute('aria-pressed', String(panel === guidePanel));
    tabs.append(tab);
  }
  dialog.append(tabs);
  const body = element('div', 'controls-menu-body');
  body.append(guidePanel, playerPanel);
  dialog.append(body);
  const picker = element('label', 'guide-picker', 'Keys for');
  const profiles = element('select');
  profiles.setAttribute('aria-label', 'Control profile');
  for (const profile of [...Object.values(content.keyboards), ...Object.values(content.gamepads)]) {
    const option = element('option', '', profile.displayName);
    option.value = profile.id;
    profiles.append(option);
  }
  profiles.value = profileId;
  profiles.onchange = () => {
    profileId = profiles.value;
    renderEditor();
  };
  picker.append(profiles);
  guidePanel.append(picker);
  const editor = element('div');
  guidePanel.append(editor);
  const hint = element('p', 'key-capture-hint', 'Select a key to change it.');
  hint.setAttribute('aria-live', 'polite');
  guidePanel.append(hint);
  guidePanel.append(
    button(
      'Reset these keys',
      () => {
        save(defaults.keyboards[profileId] ?? defaults.gamepads[profileId]!);
        renderEditor();
      },
      'quiet-button',
    ),
  );

  const presetLabel = element('label', 'guide-picker', 'Quick setup');
  const preset = element('select');
  preset.setAttribute('aria-label', 'Player setup');
  for (const [id, name] of [
    ['custom', 'Custom'],
    ['solo', 'One player'],
    ['shared-two', 'Two players · one keyboard'],
    ['shared-three', 'Three players · one keyboard'],
    ['gamepads', 'Connected gamepads'],
  ]) {
    const option = element('option', '', name);
    option.value = id!;
    preset.append(option);
  }
  preset.onchange = () => {
    if (preset.value === 'custom') {
      return;
    }
    const pads = connectedGamepads();
    if (preset.value === 'gamepads' && !pads.length) {
      error = 'Connect a gamepad and press a button first.';
      updateStatus();
      return;
    }
    assignments = presetAssignments(
      preset.value as SetupPreset,
      pads.map((pad) => pad.index),
      Object.keys(assigned),
    );
    profileId =
      preset.value === 'solo'
        ? 'keyboard-solo'
        : preset.value === 'gamepads'
          ? 'standard-gamepad'
          : 'keyboard-1';
    profiles.value = profileId;
    error = '';
    renderAssignments();
    renderEditor();
  };
  presetLabel.append(preset);
  playerPanel.append(presetLabel);
  const rows = element('div', 'player-inputs');
  playerPanel.append(rows);
  const deviceStatus = element('p', 'device-help');
  deviceStatus.setAttribute('aria-live', 'polite');
  playerPanel.append(deviceStatus);
  playerPanel.append(
    element(
      'p',
      'device-help',
      'For a gamepad, connect USB or Bluetooth and press a button. Computer-controlled slots join automatically.',
    ),
  );
  const footer = element('footer', 'controls-menu-footer');
  const status = element('p', 'controls-validation');
  status.setAttribute('aria-live', 'polite');
  const apply = button(
    'Done',
    () => {
      if (!apply.disabled) {
        onApply(structuredClone(assignments), draftContent);
        close();
      }
    },
    'menu-button menu-primary',
  );
  footer.append(status, apply);
  dialog.append(footer);

  function renderAssignments() {
    rows.replaceChildren();
    for (const id of Object.keys(assignments)) {
      const row = element('div', 'player-input-row');
      const text = element('span');
      text.append(
        element('strong', '', id),
        element('span', '', id.endsWith('1') ? 'Leader' : 'Partner'),
      );
      row.append(
        text,
        controllerAssignment(id, assignments, draftContent, (next) => {
          assignments[id] = next;
          preset.value = 'custom';
          error = '';
          renderAssignments();
        }),
      );
      rows.append(row);
    }
    updateStatus();
  }
  function updateStatus() {
    const pads = connectedGamepads();
    const issues = setupErrors(
      assignments,
      draftContent,
      pads.map((pad) => pad.index),
    );
    status.textContent = error || issues[0] || '';
    status.hidden = !status.textContent;
    apply.disabled = !!error || issues.length > 0 || !!capture;
    deviceStatus.textContent = pads.length
      ? `${pads.length} gamepad${pads.length === 1 ? '' : 's'} connected`
      : 'No gamepads connected';
  }
  function save(profile: KeyboardDefinition | GamepadDefinition) {
    try {
      draftContent = replaceControlProfile(draftContent, profile);
      error = '';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    updateStatus();
  }
  function renderEditor() {
    capture = null;
    const profile = draftContent.keyboards[profileId] ?? draftContent.gamepads[profileId]!;
    editor.replaceChildren(
      createControlProfileFields(
        profile,
        (next) => {
          save(next);
          renderEditor();
        },
        (action, append) => {
          capture = { action, append };
          hint.textContent = `Press a key for ${ACTION_LABELS[action]}. Escape cancels.`;
          updateStatus();
        },
      ),
    );
    hint.textContent =
      profile.kind === 'keyboard'
        ? 'Select a key to change it.'
        : 'Use the left stick or D-pad to move.';
    updateStatus();
  }
  const keydown = (event: KeyboardEvent) => {
    if (!capture) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape') {
      renderEditor();
      return;
    }
    if (event.repeat) {
      return;
    }
    const next = structuredClone(draftContent.keyboards[profileId]!);
    next.bindings[capture.action] = capture.append
      ? [...new Set([...next.bindings[capture.action], event.code])]
      : [event.code];
    save(next);
    renderEditor();
    hint.textContent = `Key set to ${keyLabel(event.code)}.`;
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
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (capture) {
      renderEditor();
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
    const next = connectedGamepads()
      .map((pad) => `${pad.index}:${pad.id}`)
      .join('|');
    if (next !== signature) {
      signature = next;
      renderAssignments();
    }
  }, 200);
  return { dispose: close };
}
