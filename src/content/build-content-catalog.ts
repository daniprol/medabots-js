import { millisecondsToTicks } from '../battle-core/timing';
import type { ContentCatalog, RawDocument } from './catalog';
import { parseContentDocument, invalidContent } from './parse-content-document';
import type { Definition } from './schemas';
import { validateContent } from './validate-content';

/** Parse, normalize, validate and freeze local documents without browser or filesystem access. */
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

  for (const document of [...documents].sort((first, second) =>
    first.path.localeCompare(second.path),
  )) {
    const definition = parseContentDocument(document);

    if (Object.hasOwn(sources, definition.id)) {
      invalidContent(
        document.path,
        '/id',
        `globally unique ID (already in ${sources[definition.id]})`,
        definition.id,
      );
    }

    sources[definition.id] = document.path;
    definitions.push(definition);
    addRuntimeDefinition(catalog, definition);
  }

  validateContent(catalog, definitions, sources);

  return freezeDefinitions(catalog);
}

function addRuntimeDefinition(catalog: ContentCatalog, definition: Definition) {
  switch (definition.kind) {
    case 'rules':
      catalog.rules[definition.id] = {
        ...definition,
        roundTicks: millisecondsToTicks(definition.roundTimeMs),
        doubleTapTicks: millisecondsToTicks(definition.doubleTapMs),
        dashDurationTicks: millisecondsToTicks(definition.dashDurationMs),
        dashCooldownTicks: millisecondsToTicks(definition.dashCooldownMs),
        dropThroughTicks: millisecondsToTicks(definition.dropThroughMs),
      };
      break;
    case 'ability':
      catalog.abilities[definition.id] = {
        ...definition,
        startupTicks: millisecondsToTicks(definition.startupMs),
        activeTicks: millisecondsToTicks(definition.activeMs),
        recoveryTicks: millisecondsToTicks(definition.recoveryMs),
        staggerTicks: millisecondsToTicks(definition.staggerMs),
        projectileLifetimeTicks: millisecondsToTicks(definition.projectileLifetimeMs),
      };
      break;
    case 'ai':
      catalog.ai[definition.id] = {
        ...definition,
        reactionTicks: millisecondsToTicks(definition.reactionMs),
      };
      break;
    case 'part':
      catalog.parts[definition.id] = definition;
      break;
    case 'character':
      catalog.characters[definition.id] = definition;
      break;
    case 'keyboard':
      catalog.keyboards[definition.id] = definition;
      break;
    case 'gamepad':
      catalog.gamepads[definition.id] = definition;
      break;
    case 'arena':
      catalog.arenas[definition.id] = definition;
      break;
    case 'match':
      catalog.matches[definition.id] = definition;
      break;
  }
}

function freezeDefinitions<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);

    for (const child of Object.values(value)) {
      freezeDefinitions(child);
    }
  }

  return value;
}
