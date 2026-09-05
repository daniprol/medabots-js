import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { Value } from '@sinclair/typebox/value';
import {
  schemas,
  Slots,
  type Definition,
  type RulesDefinition,
  type AbilityDefinition,
  type PartDefinition,
  type CharacterDefinition,
  type KeyboardDefinition,
  type GamepadDefinition,
  type AIDefinition,
  type ArenaDefinition,
  type MatchDefinition,
} from './schemas';
export type RuntimeAbility = AbilityDefinition & {
  startupTicks: number;
  activeTicks: number;
  recoveryTicks: number;
  staggerTicks: number;
  projectileLifetimeTicks: number;
};
export type RuntimeRules = RulesDefinition & {
  roundTicks: number;
  doubleTapTicks: number;
  dashDurationTicks: number;
  dashCooldownTicks: number;
  dropThroughTicks: number;
};
export type RuntimeAI = AIDefinition & { reactionTicks: number };
export type ContentCatalog = {
  rules: Record<string, RuntimeRules>;
  abilities: Record<string, RuntimeAbility>;
  parts: Record<string, PartDefinition>;
  characters: Record<string, CharacterDefinition>;
  keyboards: Record<string, KeyboardDefinition>;
  gamepads: Record<string, GamepadDefinition>;
  ai: Record<string, RuntimeAI>;
  arenas: Record<string, ArenaDefinition>;
  matches: Record<string, MatchDefinition>;
};
export type RawDocument = { path: string; text: string };
export const msToTicks = (ms: number) => Math.ceil((ms * 60) / 1000);
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
export function buildContentCatalog(documents: RawDocument[]): ContentCatalog {
  const catalog: ContentCatalog = {
    rules: {},
    abilities: {},
    parts: {},
    characters: {},
    keyboards: {},
    gamepads: {},
    ai: {},
    arenas: {},
    matches: {},
  };
  const sources: Record<string, string> = {};
  const definitions: Definition[] = [];
  const fail = (path: string, property: string, expected: string, received: unknown): never => {
    throw new Error(
      `${path} ${property || '/'}: expected ${expected}; received ${JSON.stringify(received)}`,
    );
  };
  for (const doc of [...documents].sort((a, b) => a.path.localeCompare(b.path))) {
    const errors: ParseError[] = [];
    const raw: unknown = parse(doc.text, errors, { allowTrailingComma: true });
    if (errors.length)
      fail(
        doc.path,
        `/ (offset ${errors[0]!.offset})`,
        'valid JSONC',
        printParseErrorCode(errors[0]!.error),
      );
    const kind = (raw as { kind?: string } | null)?.kind;
    if (!kind || !(kind in schemas))
      fail(doc.path, '/kind', Object.keys(schemas).join(' | '), kind);
    const schema = schemas[kind as keyof typeof schemas];
    for (const err of Value.Errors(schema, raw)) fail(doc.path, err.path, err.message, err.value);
    const def = raw as Definition;
    if (sources[def.id])
      fail(doc.path, '/id', `globally unique ID (already in ${sources[def.id]})`, def.id);
    sources[def.id] = doc.path;
    definitions.push(def);
    switch (def.kind) {
      case 'rules':
        catalog.rules[def.id] = {
          ...def,
          roundTicks: msToTicks(def.roundTimeMs),
          doubleTapTicks: msToTicks(def.doubleTapMs),
          dashDurationTicks: msToTicks(def.dashDurationMs),
          dashCooldownTicks: msToTicks(def.dashCooldownMs),
          dropThroughTicks: msToTicks(def.dropThroughMs),
        };
        break;
      case 'ability':
        catalog.abilities[def.id] = {
          ...def,
          startupTicks: msToTicks(def.startupMs),
          activeTicks: msToTicks(def.activeMs),
          recoveryTicks: msToTicks(def.recoveryMs),
          staggerTicks: msToTicks(def.staggerMs),
          projectileLifetimeTicks: msToTicks(def.projectileLifetimeMs),
        };
        break;
      case 'ai':
        catalog.ai[def.id] = { ...def, reactionTicks: msToTicks(def.reactionMs) };
        break;
      case 'part':
        catalog.parts[def.id] = def;
        break;
      case 'character':
        catalog.characters[def.id] = def;
        break;
      case 'keyboard':
        catalog.keyboards[def.id] = def;
        break;
      case 'gamepad':
        catalog.gamepads[def.id] = def;
        break;
      case 'arena':
        catalog.arenas[def.id] = def;
        break;
      case 'match':
        catalog.matches[def.id] = def;
        break;
    }
  }
  const ref = (owner: string, path: string, table: object, key: string) => {
    if (!Object.hasOwn(table, key))
      fail(sources[owner]!, path, 'existing reference of the correct kind', key);
  };
  const checkLoadout = (
    owner: string,
    loadout: CharacterDefinition['defaultLoadout'],
    path: string,
  ) => {
    for (const slot of Slots) {
      ref(owner, `${path}/${slot}`, catalog.parts, loadout[slot]);
      const part = catalog.parts[loadout[slot]]!;
      if (part.slot !== slot)
        fail(sources[owner]!, `${path}/${slot}`, `part for slot ${slot}`, part.slot);
    }
  };
  for (const def of definitions) {
    if (def.kind === 'part') {
      if (def.slot === 'legs' && !def.movement)
        fail(sources[def.id]!, '/movement', 'leg movement values', undefined);
      if (def.slot !== 'legs' && !def.abilityId)
        fail(sources[def.id]!, '/abilityId', 'ability for head/arm', undefined);
      if (def.slot !== 'legs' && def.movement)
        fail(sources[def.id]!, '/movement', 'movement only on leg parts', def.movement);
      if (def.slot === 'legs' && def.abilityId)
        fail(sources[def.id]!, '/abilityId', 'abilities on head/arm parts', def.abilityId);
      if (def.abilityId) {
        ref(def.id, '/abilityId', catalog.abilities, def.abilityId);
        if (catalog.abilities[def.abilityId]!.abilityKind === 'special')
          fail(sources[def.id]!, '/abilityId', 'normal projectile or melee ability', def.abilityId);
      }
    }
    if (def.kind === 'character') {
      checkLoadout(def.id, def.defaultLoadout, '/defaultLoadout');
      ref(def.id, '/specialAbilityId', catalog.abilities, def.specialAbilityId);
      if (catalog.abilities[def.specialAbilityId]!.abilityKind !== 'special')
        fail(sources[def.id]!, '/specialAbilityId', 'special ability', def.specialAbilityId);
      for (const slot of Slots) {
        const region = def.hitRegions[slot];
        if (
          Math.abs(region.x) + region.width / 2 > def.collider.width / 2 ||
          region.y - region.height / 2 < 0 ||
          region.y + region.height / 2 > def.collider.height
        )
          fail(
            sources[def.id]!,
            `/hitRegions/${slot}`,
            'part region within character collider',
            region,
          );
      }
    }
    if (def.kind === 'gamepad' && def.activationThreshold <= def.deadzone)
      fail(
        sources[def.id]!,
        '/activationThreshold',
        'greater than deadzone',
        def.activationThreshold,
      );
    if (def.kind === 'ability' && def.abilityKind !== 'special' && def.abilityKind !== def.delivery)
      fail(sources[def.id]!, '/delivery', def.abilityKind, def.delivery);
    if (def.kind === 'arena') {
      const ids = new Set<string>();
      for (const [i, p] of def.platforms.entries()) {
        if (ids.has(p.id)) fail(sources[def.id]!, `/platforms/${i}/id`, 'unique platform ID', p.id);
        ids.add(p.id);
        if (Math.abs(p.x) + p.width / 2 > def.width / 2 || p.y > def.height)
          fail(sources[def.id]!, `/platforms/${i}`, 'platform within arena', p);
      }
      for (const [i, s] of def.spawns.entries())
        if (Math.abs(s.x) > def.width / 2 || s.y > def.height)
          fail(sources[def.id]!, `/spawns/${i}`, 'spawn within arena', s);
    }
    if (def.kind === 'match') {
      ref(def.id, '/arenaId', catalog.arenas, def.arenaId);
      ref(def.id, '/rulesId', catalog.rules, def.rulesId);
      const ids = new Set<string>();
      const teamIds = new Set<string>();
      for (const [ti, team] of def.teams.entries()) {
        if (teamIds.has(team.id))
          fail(sources[def.id]!, `/teams/${ti}/id`, 'unique team ID', team.id);
        teamIds.add(team.id);
        if (team.combatants.filter((c) => c.role === 'leader').length !== 1)
          fail(
            sources[def.id]!,
            `/teams/${ti}/combatants`,
            'exactly one leader and one partner',
            team.combatants,
          );
        for (const [ci, c] of team.combatants.entries()) {
          const path = `/teams/${ti}/combatants/${ci}`;
          ref(def.id, `${path}/characterId`, catalog.characters, c.characterId);
          if (ids.has(c.instanceId))
            fail(sources[def.id]!, `${path}/instanceId`, 'unique instance ID', c.instanceId);
          ids.add(c.instanceId);
          if (c.loadout) checkLoadout(def.id, c.loadout, `${path}/loadout`);
        }
      }
    }
  }
  return freeze(catalog);
}
