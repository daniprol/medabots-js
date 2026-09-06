import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { button, element } from '../ui/dom';
import { BattleConnection, connectBattle } from './battle-connection';
import { contentHash } from './content-identity';
import { mountOnlineBattle } from './mount-online-battle';
import {
  createServerBrowser,
  type BrowserPreferences,
  type BattleSelection,
} from './server-browser';
import { createWaitingRoom } from './waiting-room';

export function mountOnlineMode(root: HTMLElement, content: ContentCatalog, back: () => void) {
  const screen = element('div');
  root.append(screen);
  const loading = element('section', 'error-panel', 'Loading online mode…');
  screen.append(loading);
  const controller = new AbortController();
  const preferences: BrowserPreferences = {};
  let hash = '';
  let current: { dispose: () => void } | undefined;
  let connection: BattleConnection | undefined;
  let unsubscribe: (() => void) | undefined;
  let mountedBattle = false;
  let assignment: Assignments[string];
  function browse() {
    unsubscribe?.();
    unsubscribe = undefined;
    current?.dispose();
    connection?.dispose();
    connection = undefined;
    mountedBattle = false;
    if (!controller.signal.aborted) {
      current = createServerBrowser(screen, content, hash, preferences, enter, back);
    }
  }
  function update() {
    if (
      !connection ||
      mountedBattle ||
      !connection.snapshot ||
      connection.room.state.phase === 'waiting'
    ) {
      return;
    }
    current?.dispose();
    mountedBattle = true;
    current = mountOnlineBattle(screen, connection, content, assignment, browse);
  }
  async function enter(selection: BattleSelection) {
    const room = await connectBattle(
      selection.client,
      selection.options,
      selection.roomId,
      controller.signal,
    );
    if (controller.signal.aborted) {
      void room.leave();
      return;
    }
    assignment = selection.assignment;
    connection = new BattleConnection(room);
    current?.dispose();
    current = createWaitingRoom(screen, connection, content, browse);
    unsubscribe = connection.subscribe(update);
    update();
  }
  void contentHash(content)
    .then((value) => {
      if (!controller.signal.aborted) {
        hash = value;
        browse();
        loading.remove();
      }
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        loading.replaceChildren(
          element('h1', '', 'Unable to open online mode'),
          element('p', '', error instanceof Error ? error.message : String(error)),
          button('Back to main menu', back),
        );
      }
    });
  return {
    dispose() {
      controller.abort();
      unsubscribe?.();
      current?.dispose();
      connection?.dispose();
      screen.remove();
    },
  };
}
