import type { ArenaDefinition } from '../content/schemas';
import { arenaBackdrop } from '../render/arena-art';
import { element } from './dom';

/** A lightweight scene thumbnail: the game's backdrop and actual platform layout. */
export function createArenaPreview() {
  const canvas = element('canvas', 'arena-preview');
  canvas.width = 480;
  canvas.height = 240;
  canvas.setAttribute('role', 'img');
  canvas.dataset.testid = 'arena-preview';
  const context = canvas.getContext('2d')!;
  let revision = 0;
  const images = new Map<string, HTMLImageElement>();
  return {
    element: canvas,
    update(arena: ArenaDefinition) {
      const current = ++revision;
      canvas.setAttribute('aria-label', `${arena.displayName} battlefield preview`);
      const art = arenaBackdrop(arena);
      const draw = () => {
        if (current !== revision) {
          return;
        }
        context.fillStyle = '#24485c';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const image = images.get(art.url)!;
        if (image.complete && image.naturalWidth) {
          context.drawImage(
            image,
            art.x * image.width,
            art.y * image.height,
            art.width * image.width,
            art.height * image.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }
        canvas.dataset.ready = String(image.complete && image.naturalWidth > 0);
        context.fillStyle = '#0b263644';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const x = (world: number) => 14 + (world / arena.width + 0.5) * (canvas.width - 28);
        const y = (world: number) =>
          canvas.height - 14 - (world / arena.height) * (canvas.height - 28);
        for (const platform of arena.platforms) {
          const width = (platform.width / arena.width) * (canvas.width - 28);
          context.fillStyle = '#193a48';
          context.fillRect(x(platform.x - platform.width / 2), y(platform.y), width, 5);
          context.fillStyle = '#f3dca0';
          context.fillRect(x(platform.x - platform.width / 2), y(platform.y), width, 2);
        }
        for (const platform of arena.original.movingPlatforms) {
          context.fillStyle = '#78f6f0';
          context.fillRect(x((platform.x - 216) / 8) - 10, y((367 - platform.y) / 8), 20, 4);
        }
      };
      if (!images.has(art.url)) {
        const image = new Image();
        images.set(art.url, image);
        image.src = art.url;
      }
      const image = images.get(art.url)!;
      image.onload = draw;
      image.onerror = draw;
      draw();
    },
    dispose() {
      revision++;
      for (const image of images.values()) {
        image.onload = null;
        image.onerror = null;
      }
    },
  };
}
