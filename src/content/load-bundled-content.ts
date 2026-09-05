import { buildContentCatalog } from './build-content-catalog';
export function loadBundledContent() {
  const files = import.meta.glob('../../game-data/**/*.jsonc', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  return buildContentCatalog(Object.entries(files).map(([path, text]) => ({ path, text })));
}
