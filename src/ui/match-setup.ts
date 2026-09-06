import type { BattleSetup } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { connectedGamepads } from '../input/gamepad-input';
import { spritePortrait } from '../render/sprite-assets';
import { createControllerMenu } from './controller-menu';
import { element, button } from './dom';
import {
  characterStats,
  controllerLabel,
  quickAssignments,
  selectCharacter,
  setupErrors,
} from './setup-state';

export { quickAssignments } from './setup-state';

/** One preparation screen: choose a slot, choose its robot, then start. */
export function createMatchSetup(
  root: HTMLElement,
  initialContent: ContentCatalog,
  defaultContent: ContentCatalog,
  initialSetup: BattleSetup,
  onStart: (assignments: Assignments, setup: BattleSetup, content: ContentCatalog) => void,
  saved = quickAssignments(),
) {
  let content = initialContent;
  let setup = structuredClone(initialSetup);
  let assignments = structuredClone(saved);
  let selectedSlot = 'A1';
  let menu: ReturnType<typeof createControllerMenu> | undefined;
  const screen = element('section', 'prepare-screen');
  screen.dataset.testid = 'match-setup';
  const header = element('header', 'prepare-header');
  header.append(
    element('h1', 'game-logo', 'ROBATTLE'),
    element('span', '', 'Choose your Medabots'),
  );
  screen.append(header);

  const teams = element('div', 'prepare-teams');
  teams.setAttribute('aria-label', 'Team slots');
  screen.append(teams);
  const selection = element('div', 'prepare-selection');
  const details = element('section', 'robot-profile');
  details.dataset.testid = 'character-details';
  const collection = element('section', 'robot-collection');
  const rosterTitle = element('h2', '', 'Choose a Medabot');
  const roster = element('div', 'robot-grid');
  roster.setAttribute('aria-label', 'Choose a character');
  collection.append(rosterTitle, roster);
  selection.append(details, collection);
  screen.append(selection);

  const footer = element('footer', 'prepare-footer');
  const fieldLabel = element('label', 'field-picker', 'Battle field');
  const fields = element('select');
  fields.setAttribute('aria-label', 'Battle field');
  for (const field of Object.values(content.arenas).sort(
    (a, b) => a.original.fieldId - b.original.fieldId,
  )) {
    const option = element('option', '', field.displayName);
    option.value = field.id;
    fields.append(option);
  }
  fields.value = setup.arenaId;
  fields.onchange = () => {
    setup.arenaId = fields.value;
  };
  fieldLabel.append(fields);
  const controls = button(
    'Controls',
    () => {
      menu?.dispose();
      menu = createControllerMenu(
        root,
        content,
        defaultContent,
        assignments,
        (next, nextContent) => {
          assignments = next;
          content = nextContent;
          refresh();
        },
      );
    },
    'menu-button',
  );
  const start = button(
    'Start Robattle',
    () => {
      if (!start.disabled) {
        onStart(assignments, setup, content);
      }
    },
    'menu-button menu-primary',
  );
  footer.append(fieldLabel, controls, start);
  screen.append(footer);
  const status = element('p', 'prepare-status');
  status.setAttribute('aria-live', 'polite');
  screen.append(status);
  root.append(screen);

  const portraits = Object.fromEntries(
    Object.values(content.characters).map((character) => [character.id, spritePortrait(character)]),
  );
  const portrait = (id: string, className = '') => {
    const image = element('img', className);
    image.src = portraits[id]!;
    image.alt = '';
    return image;
  };

  function refresh() {
    const current = setup.teams
      .flatMap((team) => team.combatants)
      .find((actor) => actor.instanceId === selectedSlot)!;
    teams.replaceChildren();
    for (const [index, team] of setup.teams.entries()) {
      const group = element(
        'section',
        `prepare-team ${index === 0 ? 'friendly-team' : 'rival-team'}`,
      );
      group.append(element('h2', '', index === 0 ? 'Team A' : 'Team B'));
      const slots = element('div', 'team-picks');
      for (const actor of team.combatants) {
        const definition = content.characters[actor.characterId]!;
        const pick = button(
          '',
          () => {
            selectedSlot = actor.instanceId;
            refresh();
          },
          'team-pick',
        );
        pick.setAttribute(
          'aria-label',
          `Select ${actor.instanceId} ${actor.role}: ${definition.displayName}`,
        );
        pick.setAttribute('aria-pressed', String(actor.instanceId === selectedSlot));
        const text = element('span', 'team-pick-copy');
        text.append(
          element(
            'span',
            '',
            `${actor.instanceId} · ${actor.role === 'leader' ? 'Leader' : 'Partner'}`,
          ),
          element('strong', '', definition.displayName),
        );
        text.append(
          element('span', 'input-source', controllerLabel(assignments[actor.instanceId]!, content)),
        );
        pick.append(portrait(actor.characterId), text);
        slots.append(pick);
      }
      group.append(slots);
      teams.append(group);
    }
    const definition = content.characters[current.characterId]!;
    const stats = characterStats(definition.id, content);
    const image = portrait(definition.id, 'selected-robot');
    const text = element('div', 'robot-profile-copy');
    text.append(
      element(
        'span',
        'selection-label',
        `${selectedSlot} · ${current.role === 'leader' ? 'Leader' : 'Partner'}`,
      ),
      element('h2', '', definition.displayName),
    );
    const values = element('dl', 'robot-values');
    for (const [label, value] of [
      ['Armor', stats.armor],
      ['Speed', stats.speed],
      ['Power', stats.power],
    ] as const) {
      const pair = element('div');
      pair.append(element('dt', '', label), element('dd', '', String(value)));
      values.append(pair);
    }
    text.append(values, element('p', 'robot-special', `Medaforce · ${stats.special.displayName}`));
    details.replaceChildren(image, text);
    roster.replaceChildren();
    for (const character of Object.values(content.characters).sort(
      (a, b) => a.originalSetId - b.originalSetId,
    )) {
      const choice = button(
        '',
        () => {
          setup = selectCharacter(setup, selectedSlot, character.id, content);
          refresh();
        },
        'robot-choice',
      );
      choice.setAttribute('aria-label', `Choose ${character.displayName}`);
      choice.setAttribute('aria-pressed', String(character.id === current.characterId));
      choice.append(portrait(character.id), element('span', '', character.displayName));
      roster.append(choice);
    }
    updateStatus();
  }
  function updateStatus() {
    const errors = setupErrors(
      assignments,
      content,
      connectedGamepads().map((pad) => pad.index),
    );
    start.disabled = errors.length > 0;
    status.textContent = errors[0] ?? '';
    status.hidden = errors.length === 0;
  }
  refresh();
  let signature = '';
  const interval = window.setInterval(() => {
    const next = connectedGamepads()
      .map((pad) => pad.index)
      .join(',');
    if (next !== signature) {
      signature = next;
      updateStatus();
    }
  }, 300);
  return {
    dispose() {
      clearInterval(interval);
      menu?.dispose();
      screen.remove();
    },
  };
}
