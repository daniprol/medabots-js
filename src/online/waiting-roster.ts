import type { ContentCatalog } from '../content/catalog';
import { spritePortrait } from '../render/sprite-assets';
import { element } from '../ui/dom';
import type { OnlinePlayer } from './state';

/** Stable player cards updated from room state, independent of the connection lifecycle. */
export function createWaitingRoster(content: ContentCatalog, teamSize: number) {
  const roster = element('div', 'online-teams');
  // Keep each slot's DOM stable while readiness/connection patches arrive.
  const slots = ['A', 'B'].flatMap((team) => {
    const section = element('section', 'online-team');
    section.dataset.team = team;
    section.setAttribute('aria-label', `Team ${team}`);
    const heading = element('h2', '', `TEAM ${team}`);
    const cards = element('div', 'online-team-slots');
    section.append(heading, cards);
    roster.append(section);
    return Array.from({ length: teamSize }, (_, slot) => {
      const id = `${team}${slot + 1}`;
      const card = element('article', 'online-player');
      card.dataset.testid = `online-slot-${id}`;
      const role = element('span', 'online-slot-role', slot === 0 ? '◆ Leader' : 'Partner');
      const you = element('span', 'online-you', 'YOU');
      const top = element('div', 'online-player-top');
      top.append(role, you);
      const portrait = element('img', 'online-player-portrait');
      const empty = element('div', 'online-slot-empty', '+');
      empty.setAttribute('aria-hidden', 'true');
      const art = element('div', 'online-player-art');
      art.append(portrait, empty);
      const name = element('strong', 'online-player-name');
      const character = element('span', 'online-player-character');
      const badge = element('span', 'online-ready-badge');
      const identity = element('div', 'online-player-identity');
      identity.append(name, character);
      card.append(top, art, identity, badge);
      cards.append(card);
      return { id, card, portrait, empty, you, name, character, badge };
    });
  });
  return {
    element: roster,
    update(players: readonly OnlinePlayer[], selfId: string | undefined) {
      for (const slot of slots) {
        const player = players.find((p) => p.combatantId === slot.id);
        const condition = !player
          ? 'open'
          : !player.connected
            ? 'reconnecting'
            : player.ready
              ? 'ready'
              : 'joined';
        slot.card.dataset.state = condition;
        slot.card.setAttribute('aria-label', `${slot.id}: ${player ? player.name : 'Open slot'}`);
        slot.you.hidden = slot.id !== selfId;
        slot.portrait.hidden = !player;
        slot.empty.hidden = !!player;
        if (player) {
          const character = content.characters[player.characterId]!;
          const portraitUrl = spritePortrait(character);
          if (slot.portrait.getAttribute('src') !== portraitUrl) {
            slot.portrait.src = portraitUrl;
          }
          slot.portrait.alt = character.displayName;
          slot.name.textContent = player.name;
          slot.character.textContent = character.displayName;
        } else {
          slot.name.textContent = 'Open slot';
          slot.character.textContent = '';
        }
        slot.badge.textContent =
          condition === 'ready'
            ? '✓ Ready'
            : condition === 'reconnecting'
              ? '↻ Reconnecting'
              : condition === 'joined'
                ? '○ Not ready'
                : 'Waiting…';
      }
    },
  };
}
