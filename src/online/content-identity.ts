import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import type { ContentCatalog } from '../content/catalog';

/** Stable across Node and Vite file enumeration order; controller preferences are local. */
export function contentIdentity(content: ContentCatalog): string {
  function sorted(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(sorted);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, sorted(item)]),
      );
    }
    return value;
  }
  return JSON.stringify(
    sorted({
      rules: content.rules,
      arenas: content.arenas,
      characters: content.characters,
      parts: content.parts,
      medals: content.medals,
      abilities: content.abilities,
    }),
  );
}

export async function contentHash(content: ContentCatalog): Promise<string> {
  // Pure JS also works when the development app is opened over HTTP on a LAN,
  // where browsers do not expose crypto.subtle.
  return bytesToHex(sha256(new TextEncoder().encode(contentIdentity(content))));
}
