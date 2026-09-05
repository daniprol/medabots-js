import type { ContentCatalog } from '../content/build-content-catalog';
import type { BattleSetup } from '../battle-core';
import type { Assignments } from '../input/bindings';
import { connectedGamepads } from '../input/gamepad-input';
import { RosterPreview } from '../render/roster-preview';
import { controllerMenu } from './controller-menu';
import {
  characterStats,
  controllerLabel,
  presetAssignments,
  quickAssignments,
  selectCharacter,
  setupErrors,
} from './setup-state';
import { element, button } from './dom';
export { quickAssignments } from './setup-state';
export function createMatchSetup(
  root: HTMLElement,
  initialContent: ContentCatalog,
  defaultContent: ContentCatalog,
  initialSetup: BattleSetup,
  onStart: (assignments: Assignments, setup: BattleSetup, content: ContentCatalog) => void,
  saved = quickAssignments(),
) {
  let content = initialContent,
    setup = structuredClone(initialSetup),
    assignments = structuredClone(saved),
    selectedSlot = 'A1';
  let menu: ReturnType<typeof controllerMenu> | undefined;
  const screen = element('section', 'roster-screen');
  screen.dataset.testid = 'match-setup';
  const nav = element('header', 'roster-nav');
  nav.append(
    element('div', 'brand', 'MEDABOTS'),
    element('span', 'roster-nav-title', 'AX / ROBATTLE ARENA'),
  );
  const navLinks = element('div', 'roster-nav-links');
  navLinks.append(
    element('span', 'current-page', 'LOCAL ROBATTLE'),
    button('⚙  CONTROLS', openControls, 'nav-control-button'),
  );
  const players = element('span', 'player-count');
  navLinks.append(players);
  nav.append(navLinks);
  screen.append(nav);
  const intro = element('div', 'roster-intro');
  const heading = element('div');
  heading.append(
    element('span', 'eyebrow', 'YOUR TEAM. YOUR PLAYSTYLE.'),
    element('h1', '', 'BUILD YOUR TEAM.'),
  );
  const instruction = element('div', 'roster-instruction');
  instruction.append(
    element('strong', '', '01  SELECT A SLOT'),
    element('span', '', '02  CHOOSE A MEDABOT'),
    element('span', '', '03  ROBATTLE'),
  );
  intro.append(heading, instruction);
  screen.append(intro);
  const layout = element('div', 'roster-layout');
  const slots = element('aside', 'roster-slots');
  slots.setAttribute('aria-label', 'Team slots');
  layout.append(slots);
  const showcase = element('section', 'character-showcase');
  const showcaseTop = element('div', 'showcase-heading');
  const focused = element('span', 'eyebrow');
  showcaseTop.append(focused, element('span', 'showcase-live', '● LIVE PREVIEW'));
  showcase.append(showcaseTop);
  const previewBox = element('div', 'roster-model');
  showcase.append(previewBox);
  const platform = element('div', 'preview-platform');
  previewBox.append(platform);
  const roster = element('div', 'character-choices');
  roster.setAttribute('aria-label', 'Choose a character');
  showcase.append(roster);
  layout.append(showcase);
  const details = element('section', 'character-details');
  details.dataset.testid = 'character-details';
  layout.append(details);
  screen.append(layout);
  const footer = element('footer', 'roster-footer');
  const quickLayouts = element('div', 'roster-quick-layouts');
  quickLayouts.append(element('span', '', 'PLAY YOUR WAY'));
  for (const [preset, label] of [
    ['solo', '1 PLAYER'],
    ['shared-two', '2 ON ONE KEYBOARD'],
  ] as const)
    quickLayouts.append(
      button(
        label,
        () => {
          assignments = presetAssignments(preset);
          refresh();
        },
        'preset-button',
      ),
    );
  quickLayouts.append(button('CUSTOMIZE CONTROLS', openControls, 'text-button'));
  footer.append(quickLayouts);
  const match = element('div', 'match-summary');
  match.append(
    element('strong', '', content.arenas[setup.arenaId]!.displayName),
    element(
      'span',
      '',
      `${content.rules[setup.rulesId]!.roundTimeMs / 1000}s · 2 vs 2 · Leader elimination`,
    ),
  );
  footer.append(match);
  const start = button(
    'START ROBATTLE  ↗',
    () => {
      if (!start.disabled) onStart(assignments, setup, content);
    },
    'button primary start-match',
  );
  footer.append(start);
  screen.append(footer);
  const status = element('div', 'roster-status');
  status.setAttribute('aria-live', 'polite');
  screen.append(status);
  root.append(screen);
  const preview = new RosterPreview(
    previewBox,
    content,
    setup.teams[0]!.combatants[0]!.characterId,
  );
  const portraits = preview.portraits();
  function openControls() {
    menu?.dispose();
    menu = controllerMenu(root, content, defaultContent, assignments, (next, nextContent) => {
      assignments = next;
      content = nextContent;
      refresh();
    });
  }
  function refresh() {
    const current = setup.teams
      .flatMap((t) => t.combatants)
      .find((c) => c.instanceId === selectedSlot)!;
    const def = content.characters[current.characterId]!;
    slots.replaceChildren();
    for (const [i, team] of setup.teams.entries()) {
      const group = element('div', `roster-team ${i === 0 ? 'team-a' : 'team-b'}`);
      const title = element('div', 'roster-team-heading');
      title.append(
        element('strong', '', `TEAM ${i === 0 ? 'A' : 'B'}`),
        element('span', '', i === 0 ? 'CYAN DIVISION' : 'CORAL DIVISION'),
      );
      group.append(title);
      for (const c of team.combatants) {
        const character = content.characters[c.characterId]!;
        const b = button(
          '',
          () => {
            selectedSlot = c.instanceId;
            preview.select(c.characterId);
            refresh();
          },
          'roster-slot',
        );
        b.setAttribute('aria-label', `Select ${c.instanceId} ${c.role}: ${character.displayName}`);
        b.setAttribute('aria-pressed', String(c.instanceId === selectedSlot));
        b.classList.toggle('selected', c.instanceId === selectedSlot);
        const img = element('img');
        img.src = portraits[c.characterId]!;
        img.alt = '';
        const text = element('div', 'slot-copy');
        text.append(
          element(
            'span',
            'slot-role',
            `${c.instanceId} / ${c.role === 'leader' ? '◆ LEADER' : 'PARTNER'}`,
          ),
          element('strong', '', character.displayName),
          element('span', 'slot-controller', controllerLabel(assignments[c.instanceId]!, content)),
        );
        b.append(img, text, element('span', 'slot-arrow', '↗'));
        group.append(b);
      }
      slots.append(group);
    }
    focused.textContent = `CUSTOMIZING ${selectedSlot} / ${current.role.toUpperCase()}`;
    roster.replaceChildren();
    for (const character of Object.values(content.characters)) {
      const b = button(
        '',
        () => {
          setup = selectCharacter(setup, selectedSlot, character.id, content);
          preview.select(character.id);
          refresh();
        },
        'character-choice',
      );
      b.setAttribute('aria-label', `Choose ${character.displayName}`);
      b.setAttribute('aria-pressed', String(character.id === current.characterId));
      b.classList.toggle('selected', character.id === current.characterId);
      const img = element('img');
      img.src = portraits[character.id]!;
      img.alt = '';
      b.append(img, element('strong', '', character.displayName));
      roster.append(b);
    }
    const stats = characterStats(current.characterId, content);
    details.replaceChildren(
      element(
        'span',
        'character-type',
        stats.style === 'melee' ? 'CLOSE COMBAT / BLADE' : 'LONG RANGE / CANNON',
      ),
      element('h2', '', def.displayName),
      element('p', 'character-tagline', def.tagline.replace(' / ', ' · ')),
    );
    const statList = element('div', 'character-stats');
    for (const [label, value, max, unit] of [
      ['TOTAL ARMOR', stats.armor, 2600, 'HP'],
      ['MOVEMENT', stats.speed, 10, 'SPD'],
      ['ATTACK POWER', stats.power, 35, 'DMG'],
      ['JUMP', stats.jump, 20, 'VEL'],
    ] as const) {
      const row = element('div', 'character-stat');
      const names = element('div');
      names.append(element('span', '', label), element('strong', '', `${value} ${unit}`));
      const track = element('div', 'stat-track');
      const bar = element('i');
      bar.style.width = `${Math.min(100, (value / max) * 100)}%`;
      track.append(bar);
      row.append(names, track);
      statList.append(row);
    }
    details.append(statList);
    const special = element('div', 'character-special');
    special.append(
      element('span', 'eyebrow', '✦ MEDAFORCE'),
      element('h3', '', stats.special.displayName),
      element(
        'p',
        '',
        `${stats.special.damage} damage · ${stats.special.delivery === 'melee' ? 'Sweeping close-range strike' : 'High-powered energy projectile'}`,
      ),
    );
    details.append(special);
    const rules = element('div', 'roster-rules');
    rules.append(
      element('span', 'rule-icon', '⬡'),
      element('strong', '', 'BREAK ARMOR. EXPOSE THE HEAD.'),
      element(
        'p',
        '',
        'Both arms and legs protect the head. Break all three, then disable the enemy leader to win.',
      ),
    );
    details.append(rules);
    updateStatus();
  }
  function updateStatus() {
    const errors = setupErrors(
      assignments,
      content,
      connectedGamepads().map((p) => p.index),
    );
    start.disabled = errors.length > 0;
    status.textContent =
      errors[0] ?? 'Choose a team slot, then pick its Medabot. Both teams can use any character.';
    status.classList.toggle('invalid', errors.length > 0);
    const humans = Object.values(assignments).filter((a) => a.type !== 'ai').length;
    players.textContent = `● ${humans} LOCAL PLAYER${humans === 1 ? '' : 'S'}`;
  }
  refresh();
  let signature = '';
  const interval = window.setInterval(() => {
    const next = connectedGamepads()
      .map((p) => p.index)
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
      preview.dispose();
      screen.remove();
    },
  };
}
