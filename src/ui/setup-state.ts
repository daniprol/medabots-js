import type { BattleSetup } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { assignmentErrors, keyboardConflicts } from '../input/bindings';

export type SetupPreset = 'solo' | 'shared-two' | 'shared-three' | 'gamepads';

export function presetAssignments(
  preset: SetupPreset,
  pads: number[] = [],
  slots = ['A1', 'A2', 'B1', 'B2'],
): Assignments {
  const assignments: Assignments = Object.fromEntries(
    slots.map((id) => [id, { type: 'ai', aiProfileId: 'ai-balanced' }]),
  );

  if (preset === 'solo') {
    assignments.A1 = { type: 'keyboard', profileId: 'keyboard-solo' };
  }

  if (preset === 'shared-two' || preset === 'shared-three') {
    assignments.A1 = { type: 'keyboard', profileId: 'keyboard-1' };
    assignments.B1 = { type: 'keyboard', profileId: 'keyboard-2' };

    if (preset === 'shared-three' && slots.includes('A2')) {
      assignments.A2 = { type: 'keyboard', profileId: 'keyboard-3' };
    }
  }

  if (preset === 'gamepads') {
    const playerSlots = [...slots].sort(
      (a, b) => Number(a.slice(1)) - Number(b.slice(1)) || a.localeCompare(b),
    );
    for (const [i, index] of pads.slice(0, slots.length).entries()) {
      assignments[playerSlots[i]!] = {
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
    ? `AI · ${content.ai[a.aiProfileId]?.displayName ?? 'Normal'}`
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
  const legs = content.parts[character.defaultLoadout.legs]!;
  const rules = Object.values(content.rules)[0]!.original;
  const speed = rules.speedRows[legs.speedIndex]!;
  const abilities = parts.flatMap((p) => (p.abilityId ? [content.abilities[p.abilityId]!] : []));

  return {
    armor: parts.reduce((n, p) => n + p.armor, 0),
    speed: speed[1]! / 4,
    power: Math.max(...abilities.map((a) => a.damage)),
    special: content.abilities[character.specialAbilityId]!,
  };
}

export type TeamSize = 1 | 2 | 3;

/** Resize each team without changing existing robots or their loadouts. */
export function resizeTeams(
  setup: BattleSetup,
  size: TeamSize,
  content: ContentCatalog,
): BattleSetup {
  const defaults = Object.values(content.characters).sort(
    (a, b) => a.originalSetId - b.originalSetId,
  );
  return {
    ...setup,
    teams: setup.teams.map((team, teamIndex) => ({
      ...team,
      combatants: Array.from({ length: size }, (_, memberIndex) =>
        structuredClone(
          team.combatants[memberIndex] ?? {
            instanceId: `${teamIndex === 0 ? 'A' : 'B'}${memberIndex + 1}`,
            characterId: defaults[(teamIndex + memberIndex * 2) % defaults.length]!.id,
            role: memberIndex === 0 ? 'leader' : 'partner',
          },
        ),
      ),
    })),
  };
}

export function assignmentsForSetup(setup: BattleSetup, saved: Assignments): Assignments {
  return Object.fromEntries(
    setup.teams
      .flatMap((team) => team.combatants)
      .map((actor) => [
        actor.instanceId,
        structuredClone(saved[actor.instanceId] ?? { type: 'ai', aiProfileId: 'ai-balanced' }),
      ]),
  );
}
