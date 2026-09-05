import type { BattleSetup } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { assignmentErrors, keyboardConflicts } from '../input/bindings';

export type SetupPreset = 'solo' | 'shared-two' | 'shared-three' | 'gamepads';

export function presetAssignments(preset: SetupPreset, pads: number[] = []): Assignments {
  const assignments: Assignments = Object.fromEntries(
    ['A1', 'A2', 'B1', 'B2'].map((id) => [id, { type: 'ai', aiProfileId: 'ai-balanced' }]),
  );

  if (preset === 'solo') {
    assignments.A1 = { type: 'keyboard', profileId: 'keyboard-solo' };
  }

  if (preset === 'shared-two' || preset === 'shared-three') {
    assignments.A1 = { type: 'keyboard', profileId: 'keyboard-1' };
    assignments.B1 = { type: 'keyboard', profileId: 'keyboard-2' };

    if (preset === 'shared-three') {
      assignments.A2 = { type: 'keyboard', profileId: 'keyboard-3' };
    }
  }

  if (preset === 'gamepads') {
    for (const [i, index] of pads.slice(0, 4).entries()) {
      assignments[['A1', 'B1', 'A2', 'B2'][i]!] = {
        type: 'gamepad',
        gamepadIndex: index,
        profileId: 'standard-gamepad',
      };
    }
  }

  return assignments;
}

export const quickAssignments = () => presetAssignments('solo');

export function controllerLabel(a: Assignments[string], content: ContentCatalog) {
  return a.type === 'ai'
    ? 'CPU · AI'
    : a.type === 'gamepad'
      ? `Gamepad ${a.gamepadIndex + 1}`
      : (content.keyboards[a.profileId]?.displayName ?? 'Unknown keyboard');
}

export function setupErrors(assignments: Assignments, content: ContentCatalog, pads: number[]) {
  return [
    ...assignmentErrors(assignments),
    ...keyboardConflicts(
      Object.values(assignments).flatMap((a) =>
        a.type === 'keyboard' ? [content.keyboards[a.profileId]!] : [],
      ),
    ).map((c) => `Shared key: ${c}`),
    ...Object.values(assignments).flatMap((a) =>
      a.type === 'gamepad' && !pads.includes(a.gamepadIndex)
        ? [`Reconnect gamepad ${a.gamepadIndex + 1} or assign another controller.`]
        : [],
    ),
  ];
}

export function selectCharacter(
  setup: BattleSetup,
  slotId: string,
  characterId: string,
  content: ContentCatalog,
): BattleSetup {
  if (!content.characters[characterId]) {
    throw new Error(`Unknown character ${characterId}`);
  }

  const next = structuredClone(setup);
  const slot = next.teams.flatMap((t) => t.combatants).find((c) => c.instanceId === slotId);

  if (!slot) {
    throw new Error(`Unknown combatant ${slotId}`);
  }

  slot.characterId = characterId;
  delete slot.loadout;

  return next;
}

export function characterStats(id: string, content: ContentCatalog) {
  const character = content.characters[id]!;
  const parts = Object.values(character.defaultLoadout).map((id) => content.parts[id]!);
  const movement = content.parts[character.defaultLoadout.legs]!.movement!;
  const abilities = parts.flatMap((p) => (p.abilityId ? [content.abilities[p.abilityId]!] : []));

  return {
    armor: parts.reduce((n, p) => n + p.armor, 0),
    speed: movement.speed,
    jump: movement.jumpSpeed,
    power: Math.max(...abilities.map((a) => a.damage)),
    special: content.abilities[character.specialAbilityId]!,
    style:
      content.abilities[content.parts[character.defaultLoadout.rightArm]!.abilityId!]!.delivery,
  };
}
