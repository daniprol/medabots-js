import type { ContentCatalog } from './catalog';
import { invalidContent } from './parse-content-document';
import { PART_SLOTS, type Definition, type CharacterDefinition } from './schemas';

/** Check references and constraints that involve more than one field or document. */
export function validateContent(
  catalog: ContentCatalog,
  definitions: Definition[],
  sources: Record<string, string>,
) {
  const ref = (owner: string, path: string, table: object, key: string) => {
    if (!Object.hasOwn(table, key)) {
      invalidContent(sources[owner]!, path, 'existing reference of the correct kind', key);
    }
  };
  const checkLoadout = (
    owner: string,
    loadout: CharacterDefinition['defaultLoadout'],
    path: string,
  ) => {
    for (const slot of PART_SLOTS) {
      ref(owner, `${path}/${slot}`, catalog.parts, loadout[slot]);

      const part = catalog.parts[loadout[slot]]!;

      if (part.slot !== slot) {
        invalidContent(sources[owner]!, `${path}/${slot}`, `part for slot ${slot}`, part.slot);
      }
    }
  };

  for (const definition of definitions) {
    if (definition.kind === 'part') {
      if (definition.slot === 'legs' && !definition.movement) {
        invalidContent(sources[definition.id]!, '/movement', 'leg movement values', undefined);
      }

      if (definition.slot !== 'legs' && !definition.abilityId) {
        invalidContent(sources[definition.id]!, '/abilityId', 'ability for head/arm', undefined);
      }

      if (definition.slot !== 'legs' && definition.movement) {
        invalidContent(
          sources[definition.id]!,
          '/movement',
          'movement only on leg parts',
          definition.movement,
        );
      }

      if (definition.slot === 'legs' && definition.abilityId) {
        invalidContent(
          sources[definition.id]!,
          '/abilityId',
          'abilities on head/arm parts',
          definition.abilityId,
        );
      }

      if (definition.abilityId) {
        ref(definition.id, '/abilityId', catalog.abilities, definition.abilityId);

        if (catalog.abilities[definition.abilityId]!.abilityKind === 'special') {
          invalidContent(
            sources[definition.id]!,
            '/abilityId',
            'normal projectile or melee ability',
            definition.abilityId,
          );
        }
      }
    }

    if (definition.kind === 'character') {
      checkLoadout(definition.id, definition.defaultLoadout, '/defaultLoadout');
      ref(definition.id, '/specialAbilityId', catalog.abilities, definition.specialAbilityId);

      if (catalog.abilities[definition.specialAbilityId]!.abilityKind !== 'special') {
        invalidContent(
          sources[definition.id]!,
          '/specialAbilityId',
          'special ability',
          definition.specialAbilityId,
        );
      }

      for (const slot of PART_SLOTS) {
        const region = definition.hitRegions[slot];

        if (
          Math.abs(region.x) + region.width / 2 > definition.collider.width / 2 ||
          region.y - region.height / 2 < 0 ||
          region.y + region.height / 2 > definition.collider.height
        ) {
          invalidContent(
            sources[definition.id]!,
            `/hitRegions/${slot}`,
            'part region within character collider',
            region,
          );
        }
      }
    }

    if (definition.kind === 'gamepad' && definition.activationThreshold <= definition.deadzone) {
      invalidContent(
        sources[definition.id]!,
        '/activationThreshold',
        'greater than deadzone',
        definition.activationThreshold,
      );
    }

    if (
      definition.kind === 'ability' &&
      definition.abilityKind !== 'special' &&
      definition.abilityKind !== definition.delivery
    ) {
      invalidContent(
        sources[definition.id]!,
        '/delivery',
        definition.abilityKind,
        definition.delivery,
      );
    }

    if (definition.kind === 'arena') {
      const ids = new Set<string>();

      for (const [i, p] of definition.platforms.entries()) {
        if (ids.has(p.id)) {
          invalidContent(sources[definition.id]!, `/platforms/${i}/id`, 'unique platform ID', p.id);
        }

        ids.add(p.id);

        if (Math.abs(p.x) + p.width / 2 > definition.width / 2 || p.y > definition.height) {
          invalidContent(sources[definition.id]!, `/platforms/${i}`, 'platform within arena', p);
        }
      }

      for (const [i, s] of definition.spawns.entries()) {
        if (Math.abs(s.x) > definition.width / 2 || s.y > definition.height) {
          invalidContent(sources[definition.id]!, `/spawns/${i}`, 'spawn within arena', s);
        }
      }
    }

    if (definition.kind === 'match') {
      ref(definition.id, '/arenaId', catalog.arenas, definition.arenaId);
      ref(definition.id, '/rulesId', catalog.rules, definition.rulesId);

      const ids = new Set<string>();
      const teamIds = new Set<string>();

      for (const [ti, team] of definition.teams.entries()) {
        if (teamIds.has(team.id)) {
          invalidContent(sources[definition.id]!, `/teams/${ti}/id`, 'unique team ID', team.id);
        }

        teamIds.add(team.id);

        if (team.combatants.filter((combatant) => combatant.role === 'leader').length !== 1) {
          invalidContent(
            sources[definition.id]!,
            `/teams/${ti}/combatants`,
            'exactly one leader and one partner',
            team.combatants,
          );
        }

        for (const [ci, c] of team.combatants.entries()) {
          const path = `/teams/${ti}/combatants/${ci}`;
          ref(definition.id, `${path}/characterId`, catalog.characters, c.characterId);

          if (ids.has(c.instanceId)) {
            invalidContent(
              sources[definition.id]!,
              `${path}/instanceId`,
              'unique instance ID',
              c.instanceId,
            );
          }

          ids.add(c.instanceId);

          if (c.loadout) {
            checkLoadout(definition.id, c.loadout, `${path}/loadout`);
          }
        }
      }
    }
  }
}
