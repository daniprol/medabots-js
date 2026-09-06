import * as THREE from 'three';

import type { ContentCatalog } from '../content/catalog';
import type { CharacterDefinition } from '../content/schemas';

const atlases = new Map<string, THREE.Texture>();
const portraits = new Map<string, string>();

export async function preloadSprites(content: ContentCatalog) {
  const urls = new Set(
    Object.values(content.characters).flatMap((character) =>
      character.visual.type === 'sprite' ? [character.visual.url] : [],
    ),
  );
  await Promise.all(
    [...urls].map(async (url) => {
      if (atlases.has(url)) {
        return;
      }
      const texture = await new THREE.TextureLoader().loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      atlases.set(url, texture);
    }),
  );
}

export function spriteTexture(definition: CharacterDefinition) {
  if (definition.visual.type !== 'sprite') {
    throw new Error(`Sprite artwork missing: ${definition.id}`);
  }
  const texture = atlases.get(definition.visual.url);
  if (!texture) {
    throw new Error(`Sprite atlas not loaded: ${definition.visual.url}`);
  }
  return texture;
}

export function spritePortrait(definition: CharacterDefinition) {
  const cached = portraits.get(definition.id);
  if (cached) {
    return cached;
  }
  const visual = definition.visual;
  if (visual.type !== 'sprite') {
    return '';
  }
  const image = spriteTexture(definition).image as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 260;
  const context = canvas.getContext('2d')!;
  const bounds = visual.frames[0]!;
  const scale = Math.min(220 / bounds.width, 260 / bounds.height);
  context.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    (220 - bounds.width * scale) / 2,
    260 - bounds.height * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  const url = canvas.toDataURL();
  portraits.set(definition.id, url);
  return url;
}
