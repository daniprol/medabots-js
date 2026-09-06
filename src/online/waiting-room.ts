import type { ContentCatalog } from '../content/catalog';
import { createArenaPreview } from '../ui/arena-preview';
import { button, element } from '../ui/dom';
import type { BattleConnection } from './battle-connection';
import { createWaitingRoster } from './waiting-roster';

export function createWaitingRoom(
  root: HTMLElement,
  connection: BattleConnection,
  content: ContentCatalog,
  leave: () => void,
) {
  const screen = element('section', 'online-screen online-lobby');
  screen.dataset.testid = 'online-waiting';
  const panel = element('div', 'online-panel');
  const title = element('h1', '', 'WAITING FOR PLAYERS');
  const status = element('p', 'online-status');
  const announcement = element('div', 'online-lobby-announcement');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.append(title, status);
  const progress = element('div', 'online-room-progress');
  const roster = createWaitingRoster(content, connection.room.state.teamSize);
  const ready = button(
    'Ready to battle',
    () => connection.room.send('ready', true),
    'button primary online-ready-button',
  );
  const actionHint = element('span', 'online-action-hint');
  const preview = createArenaPreview();
  const arena = content.arenas[connection.room.state.arenaId]!;
  preview.update(arena);
  const arenaInfo = element('div');
  arenaInfo.append(
    element(
      'span',
      'eyebrow',
      `${connection.room.state.teamSize} VS ${connection.room.state.teamSize}`,
    ),
    element('strong', '', arena.displayName),
  );
  const arenaSummary = element('div', 'online-arena-summary');
  arenaSummary.append(preview.element, arenaInfo);
  const details = element('details', 'online-room-details');
  details.append(
    element('summary', '', 'Room info'),
    element('p', '', `Room ${connection.room.roomId}`),
  );
  const header = element('header', 'online-section-heading');
  header.append(element('span', 'eyebrow', 'BATTLE ROOM'), details);
  const footer = element('footer', 'online-lobby-actions');
  footer.setAttribute('role', 'group');
  footer.setAttribute('aria-label', 'Room actions');
  const confirmation = element('div');
  confirmation.append(actionHint, ready);
  footer.append(button('Leave room', leave, 'button ghost'), confirmation);
  panel.append(header, announcement, progress, arenaSummary, roster.element);
  screen.append(panel, footer);
  root.append(screen);

  const update = () => {
    const state = connection.room.state;
    const players = Array.from(state.players.values());
    const self = state.players.get(connection.room.sessionId);
    const total = state.teamSize * 2;
    const missing = total - players.length;
    const readyCount = players.filter((player) => player.ready && player.connected).length;
    const disconnected = players.some((player) => !player.connected);
    let heading =
      missing > 0 ? 'WAITING FOR PLAYERS' : self?.ready ? 'WAITING FOR OTHERS' : 'READY UP!';
    let hint =
      missing > 0
        ? `${missing} more ${missing === 1 ? 'player' : 'players'} needed`
        : self?.ready
          ? 'Waiting for the other players to ready up'
          : 'Everyone’s here. Ready to battle?';
    if (disconnected) {
      heading = 'PLAYER RECONNECTING';
      hint = 'Their slot is reserved';
    }
    if (state.phase === 'countdown') {
      heading = `STARTING IN ${state.countdown}`;
      hint = 'Get ready!';
    }
    if (state.phase === 'preparing') {
      heading = 'LOADING ARENA';
      hint = 'Waiting for all players to load';
    }
    if (state.phase === 'abandoned') {
      heading = 'ROOM CLOSED';
      hint = state.notice;
    }
    if (connection.status !== 'connected') {
      heading = connection.status === 'reconnecting' ? 'RECONNECTING…' : 'DISCONNECTED';
      hint =
        connection.status === 'reconnecting'
          ? 'Your slot is reserved'
          : 'Leave the room to try again';
    }
    title.textContent = heading;
    status.textContent = hint;
    screen.dataset.state =
      connection.status !== 'connected' ? connection.status : missing > 0 ? 'waiting' : 'filled';
    progress.replaceChildren(
      element('strong', '', `${players.length} / ${total} players`),
      element('span', '', `✓ ${readyCount} / ${total} ready`),
    );
    ready.disabled =
      self?.ready === true || connection.status !== 'connected' || state.phase !== 'waiting';
    ready.dataset.ready = String(self?.ready === true);
    ready.textContent = self?.ready ? '✓ You’re ready' : 'Ready to battle';
    actionHint.textContent = self?.ready
      ? 'Battle starts when everyone is ready'
      : 'Confirm your Medabot';
    roster.update(players, self?.combatantId);
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
