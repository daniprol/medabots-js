import type { ContentCatalog } from '../content/catalog';
import { keyLabel, type Assignments } from '../input/bindings';
import { connectedGamepads } from '../input/gamepad-input';
import { element } from './dom';

export const controllerValue = (assignment: Assignments[string]) =>
  assignment.type === 'ai'
    ? 'ai'
    : assignment.type === 'keyboard'
      ? assignment.profileId
      : `pad:${assignment.gamepadIndex}`;

/** The setup cards and controls dialog share exactly the same assignment rules. */
export function controllerAssignment(
  id: string,
  assignments: Assignments,
  content: ContentCatalog,
  onChange: (assignment: Assignments[string]) => void,
) {
  const root = element('div', 'controller-assignment');
  const assignment = assignments[id]!;
  const label = element('label', '', 'Controlled by');
  const select = element('select');
  select.setAttribute('aria-label', `${id} controller`);
  const choices: [string, string][] = [
    ['ai', 'Computer · AI'],
    ...Object.values(content.keyboards).map(
      (profile) =>
        [
          profile.id,
          `Keys · ${profile.displayName
            .split('·')
            .at(profile.id === 'keyboard-solo' ? 0 : -1)!
            .trim()}`,
        ] as [string, string],
    ),
    ...connectedGamepads().map(
      (pad) => [`pad:${pad.index}`, `Player · Gamepad ${pad.index + 1}`] as [string, string],
    ),
  ];
  const value = controllerValue(assignment);
  if (!choices.some(([choice]) => choice === value)) {
    choices.push([value, 'Disconnected gamepad']);
  }
  for (const [value, name] of choices) {
    const option = element('option', '', name);
    option.value = value;
    option.disabled =
      value !== 'ai' &&
      Object.entries(assignments).some(
        ([other, input]) => other !== id && controllerValue(input) === value,
      );
    select.append(option);
  }
  select.value = value;
  select.onchange = () =>
    onChange(
      select.value === 'ai'
        ? { type: 'ai', aiProfileId: 'ai-balanced' }
        : select.value.startsWith('pad:')
          ? {
              type: 'gamepad',
              gamepadIndex: Number(select.value.slice(4)),
              profileId: 'standard-gamepad',
            }
          : { type: 'keyboard', profileId: select.value },
    );
  label.append(select);
  root.append(label);
  if (assignment.type === 'ai') {
    const difficultyLabel = element('label', '', 'AI difficulty');
    const difficulty = element('select');
    difficulty.setAttribute('aria-label', `${id} AI difficulty`);
    for (const profile of Object.values(content.ai).sort(
      (a, b) => b.attackDelayTicks - a.attackDelayTicks || a.variant - b.variant,
    )) {
      const option = element('option', '', profile.displayName);
      option.value = profile.id;
      difficulty.append(option);
    }
    difficulty.value = assignment.aiProfileId;
    difficulty.onchange = () => onChange({ type: 'ai', aiProfileId: difficulty.value });
    difficultyLabel.append(difficulty);
    root.append(difficultyLabel);
  } else {
    const badge = element('span', 'human-badge', 'PLAYER');
    if (assignment.type === 'keyboard') {
      const bindings = content.keyboards[assignment.profileId]!.bindings;
      const keys = [
        bindings.moveLeft[0],
        bindings.moveRight[0],
        bindings.rightArm[0],
        bindings.jump[0],
      ]
        .filter((code): code is string => !!code)
        .map(keyLabel);
      badge.textContent = `PLAYER · ${keys.join(' ')}`;
    }
    root.append(badge);
  }
  return root;
}
