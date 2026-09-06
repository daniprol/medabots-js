import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildContentCatalog } from '../src/content/build-content-catalog';
import type { RawDocument } from '../src/content/catalog';

export function loadServerContent(
  directory = fileURLToPath(new URL('../game-data/', import.meta.url)),
) {
  function read(directory: string): RawDocument[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? read(path)
        : entry.name.endsWith('.jsonc')
          ? [{ path, text: readFileSync(path, 'utf8') }]
          : [];
    });
  }
  return buildContentCatalog(read(directory));
}
