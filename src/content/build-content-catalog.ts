import { millisecondsToTicks } from '../battle-core/timing';
import type { ContentCatalog, RawDocument } from './catalog';
import { parseContentDocument, invalidContent } from './parse-content-document';
import type { Definition } from './schemas';
import { validateContent } from './validate-content';

/** Parse, normalize, validate and freeze local documents without browser or filesystem access. */
export function buildContentCatalog(documents: RawDocument[]): ContentCatalog {
  const catalog: ContentCatalog = {
    rules: {},
    medals: {},
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
    case 'medal':
      catalog.medals[definition.id] = definition;
      break;
    case 'rules':
      catalog.rules[definition.id] = {
        ...definition,
        roundTicks: millisecondsToTicks(definition.roundTimeMs),
      };
      break;
    case 'ability':
      catalog.abilities[definition.id] = definition;
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
