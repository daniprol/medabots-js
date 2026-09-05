import type { ContentCatalog } from '../content/build-content-catalog';
import { keyLabel, type Assignments } from '../input/bindings';
import { element } from './dom';
export function controlsStrip(content: ContentCatalog, assignments: Assignments) {
  const root = element('div', 'controls-strip');
  for (const [id, a] of Object.entries(assignments)) {
    if (a.type === 'ai') continue;
    const row = element('div', 'control-profile');
    row.append(element('strong', '', id));
    if (a.type === 'keyboard') {
      const p = content.keyboards[a.profileId]!;
      for (const [actions, label] of [
        [['moveLeft', 'moveRight'], 'MOVE'],
        [['jump'], 'JUMP'],
        [['rightArm', 'leftArm', 'head'], 'ATTACK'],
        [['guard'], 'GUARD'],
        [['chargeSpecial', 'activateSpecial'], 'CHARGE / SPECIAL'],
      ] as const) {
        const item = element('span', 'control-item');
        for (const action of actions)
          item.append(element('kbd', '', p.bindings[action].map(keyLabel).join('/')));
        item.append(element('span', '', label));
        row.append(item);
      }
    } else {
      const p = content.gamepads[a.profileId]!;
      row.append(element('span', '', 'STICK / D-PAD  MOVE'));
      for (const [action, label] of [
        ['jump', 'JUMP'],
        ['rightArm', 'R-ARM'],
        ['leftArm', 'L-ARM'],
        ['head', 'HEAD'],
        ['guard', 'GUARD'],
        ['chargeSpecial', 'CHARGE'],
        ['activateSpecial', 'SPECIAL'],
      ] as const)
        row.append(element('span', '', `B${p.bindings[action].join('/')} ${label}`));
    }
    root.append(row);
  }
  if (!root.childElementCount)
    root.append(element('span', '', 'SPECTATOR MODE · ALL COMBATANTS CONTROLLED BY AI'));
  return root;
}
