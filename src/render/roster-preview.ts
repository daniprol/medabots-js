import type { ContentCatalog } from '../content/catalog';
import { spritePortrait } from './sprite-assets';

/** Roster shares the actual battle artwork; it does not start a second WebGL context. */
export class RosterPreview {
  private image = document.createElement('img');

  constructor(
    container: HTMLElement,
    private content: ContentCatalog,
    id: string,
  ) {
    this.image.className = 'sprite-roster-preview';
    container.append(this.image);
    this.select(id);
  }

  select(id: string) {
    const definition = this.content.characters[id]!;
    this.image.src = spritePortrait(definition);
    this.image.alt = `${definition.displayName} HD sprite preview`;
  }

  portraits() {
    return Object.fromEntries(
      Object.values(this.content.characters).map((definition) => [
        definition.id,
        spritePortrait(definition),
      ]),
    );
  }

  dispose() {
    this.image.remove();
  }
}
