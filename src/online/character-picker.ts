import type { ContentCatalog } from '../content/catalog';
import { spritePortrait } from '../render/sprite-assets';
import { button, element } from '../ui/dom';

/** Reuse the game's atlas artwork; the native dialog owns focus trapping and Escape. */
export function createCharacterPicker(content: ContentCatalog, initialId: string) {
  let selectedId = initialId;
  const root = element('div', 'online-character-picker');
  const portrait = element('img');
  const name = element('strong');
  const identity = element('span', 'online-character-identity');
  identity.append(
    element('span', 'eyebrow', 'YOUR MEDABOT'),
    name,
    element('span', 'online-change', 'Change Medabot ›'),
  );
  const choose = button(
    '',
    () => {
      dialog.showModal();
      choices.get(selectedId)?.focus();
    },
    'online-character-choice',
  );
  choose.append(portrait, identity);
  const dialog = element('dialog', 'online-character-dialog');
  dialog.setAttribute('aria-label', 'Choose your Medabot');
  const header = element('header', 'online-section-heading');
  header.append(
    element('h2', '', 'CHOOSE YOUR MEDABOT'),
    button('Done', () => dialog.close(), 'button ghost'),
  );
  const grid = element('div', 'online-character-grid');
  const choices = new Map<string, HTMLButtonElement>();
  for (const character of Object.values(content.characters)) {
    const image = element('img');
    image.src = spritePortrait(character);
    image.alt = '';
    image.loading = 'lazy';
    const option = button(
      '',
      () => {
        selectedId = character.id;
        update();
        dialog.close();
      },
      'online-character-option',
    );
    option.setAttribute('aria-label', `Choose ${character.displayName}`);
    option.append(image, element('span', '', character.displayName));
    choices.set(character.id, option);
    grid.append(option);
  }
  function update() {
    const character = content.characters[selectedId]!;
    portrait.src = spritePortrait(character);
    portrait.alt = character.displayName;
    name.textContent = character.displayName;
    choose.setAttribute('aria-label', `Your character: ${character.displayName}. Change Medabot`);
    for (const [id, option] of choices) {
      option.setAttribute('aria-pressed', String(id === selectedId));
    }
  }
  update();
  dialog.append(header, grid);
  root.append(choose, dialog);
  return {
    element: root,
    get value() {
      return selectedId;
    },
    set disabled(value: boolean) {
      choose.disabled = value;
    },
    dispose() {
      dialog.close();
      root.remove();
    },
  };
}
