import type { ContentCatalog } from '../content/catalog';
import { createArenaPreview } from '../ui/arena-preview';
import { button, element } from '../ui/dom';
import type { BattleConnection } from './battle-connection';

export function createWaitingRoom(
  root: HTMLElement,
  connection: BattleConnection,
  content: ContentCatalog,
  leave: () => void,
) {
  const screen = element('section', 'online-screen');
  screen.dataset.testid = 'online-waiting';
  const panel = element('div', 'online-panel');
  const title = element('h1', '', 'WAITING FOR PLAYERS');
  const status = element('p', 'online-status');
  status.setAttribute('role', 'status');
  const roster = element('div', 'online-teams');
  const ready = button(
    'Ready to battle',
    () => {
      connection.room.send('ready', true);
    },
    'button primary',
  );
  const preview = createArenaPreview();
  preview.update(content.arenas[connection.room.state.arenaId]!);
  panel.append(
    element('span', 'eyebrow', 'ONLINE / BATTLE ROOM'),
    title,
    element(
      'p',
      '',
      `Room ${connection.room.roomId} · ${content.arenas[connection.room.state.arenaId]!.displayName}`,
    ),
    preview.element,
    status,
    roster,
    ready,
    button('Leave room', leave, 'button ghost'),
  );
  screen.append(panel);
  root.append(screen);
  const update = () => {
    const state = connection.room.state;
    title.textContent =
      state.phase === 'countdown'
        ? `BATTLE STARTS IN ${state.countdown}`
        : state.phase === 'abandoned'
          ? 'ROOM CLOSED'
          : 'WAITING FOR PLAYERS';
    const count = state.players.size;
    status.textContent =
      connection.status === 'reconnecting'
        ? 'Connection lost · Reconnecting…'
        : connection.status === 'closed'
          ? 'Disconnected. Return to the server browser to reconnect.'
          : state.notice ||
            `${count} / ${state.teamSize * 2} players · Everyone must be ready to start.`;
    const self = state.players.get(connection.room.sessionId);
    ready.disabled =
      self?.ready === true || connection.status !== 'connected' || state.phase !== 'waiting';
    ready.textContent = self?.ready ? 'Ready · Waiting for others' : 'Ready to battle';
    roster.replaceChildren(
      ...['team-a', 'team-b'].map((_team, index) => {
        const section = element('section', 'online-team');
        section.append(element('h2', '', `TEAM ${index === 0 ? 'A' : 'B'}`));
        for (let slot = 1; slot <= state.teamSize; slot++) {
          const id = `${index === 0 ? 'A' : 'B'}${slot}`;
          const player = Array.from(state.players.values()).find((p) => p.combatantId === id);
          const card = element('div', 'online-player');
          card.append(
            element('strong', '', `${id} · ${slot === 1 ? 'Leader' : 'Partner'}`),
            element(
              'span',
              '',
              player
                ? `${player.name}${player === self ? ' (you)' : ''} · ${content.characters[player.characterId]!.displayName}`
                : 'Open slot',
            ),
            element(
              'small',
              '',
              player
                ? !player.connected
                  ? 'Reconnecting…'
                  : player.ready
                    ? 'Ready'
                    : 'Preparing'
                : 'Waiting for a player',
            ),
          );
          section.append(card);
        }
        return section;
      }),
    );
  };
  update();
  const unsubscribe = connection.subscribe(update);
  return {
    dispose() {
      unsubscribe();
      screen.remove();
    },
  };
}
