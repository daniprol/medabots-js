import { Client, type Room, type RoomAvailable } from '@colyseus/sdk';

import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { createArenaPreview } from '../ui/arena-preview';
import { button, element } from '../ui/dom';
import { boundedConnection } from './battle-connection';
import { ONLINE_CONFIG } from './config';
import {
  BATTLE_ROOM,
  LOBBY_ROOM,
  type BattleListing,
  type CreateBattleOptions,
  type JoinBattleOptions,
} from './protocol';
import { normalizeServerUrl, readServers, SERVER_STORAGE_KEY } from './server-addresses';

function selectField(label: string, values: { value: string; label: string }[]) {
  const container = element('label', 'online-field');
  const input = element('select');
  input.setAttribute('aria-label', label);
  for (const value of values) {
    const option = element('option', '', value.label);
    option.value = value.value;
    input.append(option);
  }
  container.append(element('span', '', label), input);
  return { element: container, input };
}
function textField(label: string, placeholder: string, maxLength: number) {
  const container = element('label', 'online-field');
  const input = element('input');
  input.setAttribute('aria-label', label);
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  container.append(element('span', '', label), input);
  return { element: container, input };
}

export type BrowserPreferences = {
  serverUrl?: string;
  name?: string;
  characterId?: string;
  arenaId?: string;
  teamSize?: string;
  controller?: string;
};
export type BattleSelection = {
  client: Client;
  options: CreateBattleOptions | JoinBattleOptions;
  roomId?: string;
  assignment: Assignments[string];
};

export function createServerBrowser(
  root: HTMLElement,
  content: ContentCatalog,
  hash: string,
  preferences: BrowserPreferences,
  join: (selection: BattleSelection) => Promise<void>,
  back: () => void,
) {
  const screen = element('section', 'online-screen');
  screen.dataset.testid = 'online-browser';
  const panel = element('div', 'online-panel online-browser');
  panel.append(
    element('span', 'eyebrow', 'ROBATTLE / ONLINE'),
    element('h1', '', 'FIND YOUR NEXT BATTLE'),
    element(
      'p',
      'online-intro',
      'Choose a server, pick your Medabot, then join a battle or create one for your friends.',
    ),
  );
  let servers = readServers(localStorage);
  const server = selectField(
    'Server',
    servers.map((s) => ({ value: s.url, label: `${s.name} · ${s.url}` })),
  );
  server.input.value = preferences.serverUrl ?? servers[0]?.url ?? '';
  const url = textField('New server URL', 'http://localhost:2567', 2048);
  const serverName = textField('Server name', 'My server', 60);
  const addDetails = element('details', 'online-add-server');
  addDetails.append(element('summary', '', 'Add a server'));
  const errors = element('p', 'online-error');
  errors.setAttribute('role', 'alert');
  const connectionStatus = element('p', 'online-status');
  connectionStatus.setAttribute('role', 'status');
  const add = button('Save server', () => {
    try {
      const address = normalizeServerUrl(url.input.value, location.protocol);
      if (!servers.some((s) => s.url === address)) {
        const entry = {
          name: serverName.input.value.trim() || new URL(address).host,
          url: address,
        };
        servers.push(entry);
        const option = element('option', '', `${entry.name} · ${entry.url}`);
        option.value = address;
        server.input.append(option);
      }
      try {
        localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(servers));
      } catch {
        errors.textContent = 'Server added for this visit. Browser storage is unavailable.';
      }
      server.input.value = address;
      addDetails.open = false;
      void connectLobby();
    } catch (error) {
      showError(error);
    }
  });
  addDetails.append(serverName.element, url.element, add);
  const forget = button(
    'Remove saved server',
    () => {
      const selected = server.input.value;
      if (ONLINE_CONFIG.servers.some((s) => normalizeServerUrl(s.url) === selected)) {
        showError(new Error('Built-in servers are configured in the repository.'));
        return;
      }
      servers = servers.filter((s) => s.url !== selected);
      try {
        localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(servers));
      } catch {
        /* Session still works without storage. */
      }
      server.input.selectedOptions[0]?.remove();
      void connectLobby();
    },
    'button ghost',
  );
  const serverActions = element('div', 'online-actions');
  serverActions.append(
    button('Refresh battles', () => {
      void connectLobby();
    }),
    forget,
  );
  const fields = element('div', 'online-fields');
  const name = textField('Player name', 'Medafighter', 24);
  name.input.value = preferences.name ?? 'Medafighter';
  const character = selectField(
    'Your character',
    Object.values(content.characters).map((c) => ({ value: c.id, label: c.displayName })),
  );
  character.input.value =
    preferences.characterId ??
    content.matches['local-default']!.teams[0]!.combatants[0]!.characterId;
  const controllers = selectField('Your controller', [
    ...Object.values(content.keyboards).map((k) => ({ value: k.id, label: k.displayName })),
    ...Array.from({ length: 4 }, (_, index) => ({
      value: `gamepad:${index}`,
      label: `Gamepad ${index + 1}`,
    })),
  ]);
  controllers.input.value = preferences.controller ?? 'keyboard-solo';
  fields.append(name.element, character.element, controllers.element);
  const battles = element('div', 'online-battles');
  const createSection = element('section', 'online-create');
  const arena = selectField(
    'Battlefield',
    Object.values(content.arenas).map((a) => ({ value: a.id, label: a.displayName })),
  );
  arena.input.value = preferences.arenaId ?? content.matches['local-default']!.arenaId;
  const size = selectField(
    'Online match size',
    ['1', '2', '3'].map((value) => ({ value, label: `${value} vs ${value}` })),
  );
  size.input.value = preferences.teamSize ?? '1';
  const preview = createArenaPreview();
  const updatePreview = () => preview.update(content.arenas[arena.input.value]!);
  arena.input.addEventListener('change', updatePreview);
  updatePreview();
  const create = button(
    'Create battle',
    () => {
      void enter();
    },
    'button primary',
  );
  createSection.append(
    element('h2', '', 'CREATE A BATTLE'),
    arena.element,
    size.element,
    preview.element,
    create,
  );
  panel.append(
    server.element,
    serverActions,
    addDetails,
    fields,
    errors,
    connectionStatus,
    element('h2', '', 'OPEN BATTLES'),
    battles,
    createSection,
    button('Back to main menu', back, 'button ghost'),
  );
  screen.append(panel);
  root.append(screen);
  let client: Client;
  let lobby: Room | undefined;
  let attempt: AbortController | undefined;
  let disposed = false;
  let busy = false;
  let connected = false;
  const listings = new Map<string, RoomAvailable<BattleListing>>();

  function showError(error: unknown) {
    errors.textContent = error instanceof Error ? error.message : String(error);
  }
  function remember() {
    Object.assign(preferences, {
      serverUrl: server.input.value,
      name: name.input.value.trim(),
      characterId: character.input.value,
      arenaId: arena.input.value,
      teamSize: size.input.value,
      controller: controllers.input.value,
    });
  }
  function renderListings() {
    battles.replaceChildren();
    const visible = Array.from(listings.values()).filter(
      (room) => room.metadata?.phase === 'waiting' && room.clients < room.maxClients,
    );
    if (!visible.length) {
      battles.append(
        element(
          'p',
          'online-empty',
          connected
            ? 'No open battles. Create one and invite another player to this server.'
            : 'Connect to a server to see its battles.',
        ),
      );
    }
    for (const room of visible) {
      const metadata = room.metadata!;
      const compatible =
        metadata.protocolVersion === ONLINE_CONFIG.protocolVersion && metadata.contentHash === hash;
      const row = element('article', 'online-battle-row');
      const info = element('div');
      info.append(
        element(
          'strong',
          '',
          `${metadata.hostName} · ${metadata.teamSize} vs ${metadata.teamSize}`,
        ),
        element(
          'span',
          '',
          `${content.arenas[metadata.arenaId]?.displayName ?? metadata.arenaId} · ${room.clients}/${room.maxClients} players`,
        ),
      );
      const action = button(compatible ? 'Join battle' : 'Different game version', () => {
        void enter(room.roomId);
      });
      action.disabled = busy || !connected || !compatible;
      row.append(info, action);
      battles.append(row);
    }
    create.disabled = busy || !connected;
  }
  async function enter(roomId?: string) {
    if (busy || !connected) {
      return;
    }
    try {
      errors.textContent = '';
      remember();
      const playerName = name.input.value.trim();
      if (!playerName) {
        throw new Error('Enter a player name.');
      }
      let assignment: Assignments[string] = {
        type: 'keyboard',
        profileId: controllers.input.value,
      };
      if (controllers.input.value.startsWith('gamepad:')) {
        const index = Number(controllers.input.value.split(':')[1]);
        if (!navigator.getGamepads()[index]?.connected) {
          throw new Error(`Connect gamepad ${index + 1} and press a button first.`);
        }
        assignment = { type: 'gamepad', gamepadIndex: index, profileId: 'standard-gamepad' };
      }
      const common: JoinBattleOptions = {
        name: playerName,
        characterId: character.input.value,
        protocolVersion: ONLINE_CONFIG.protocolVersion,
        contentHash: hash,
      };
      const teamSize = Number(size.input.value);
      if (teamSize !== 1 && teamSize !== 2 && teamSize !== 3) {
        throw new Error('Select a match size.');
      }
      busy = true;
      renderListings();
      server.input.disabled = true;
      connectionStatus.textContent = 'Joining battle…';
      await join({
        client,
        options: roomId ? common : { ...common, arenaId: arena.input.value, teamSize },
        roomId,
        assignment,
      });
    } catch (error) {
      if (!disposed) {
        showError(error);
        connectionStatus.textContent = 'Choose another battle or try again.';
      }
    } finally {
      busy = false;
      if (!disposed) {
        renderListings();
        server.input.disabled = false;
      }
    }
  }
  async function connectLobby() {
    if (busy) {
      return;
    }
    attempt?.abort();
    if (lobby) {
      lobby.reconnection.enabled = false;
      void lobby.leave().catch(() => {});
      lobby = undefined;
    }
    const current = new AbortController();
    attempt = current;
    connected = false;
    listings.clear();
    errors.textContent = '';
    renderListings();
    try {
      const endpoint = normalizeServerUrl(server.input.value, location.protocol);
      remember();
      client = new Client(endpoint);
      connectionStatus.textContent = 'Connecting to server…';
      const room = await boundedConnection(
        client.joinOrCreate(LOBBY_ROOM, { filter: { name: BATTLE_ROOM } }),
        current.signal,
      );
      if (disposed || current.signal.aborted) {
        void room.leave();
        return;
      }
      lobby = room;
      connected = true;
      connectionStatus.textContent = `Connected to ${new URL(endpoint).host}`;
      room.onMessage<RoomAvailable<BattleListing>[]>('rooms', (rooms) => {
        listings.clear();
        for (const entry of rooms) {
          listings.set(entry.roomId, entry);
        }
        renderListings();
      });
      room.onMessage<[string, RoomAvailable<BattleListing>]>('+', ([id, entry]) => {
        listings.set(id, entry);
        renderListings();
      });
      room.onMessage<string>('-', (id) => {
        listings.delete(id);
        renderListings();
      });
      room.onLeave(() => {
        if (!disposed && lobby === room) {
          connected = false;
          connectionStatus.textContent = 'Server disconnected. Use Refresh battles to reconnect.';
          renderListings();
        }
      });
      room.onError((_code, message) => {
        if (!disposed && lobby === room) {
          showError(new Error(message ?? 'Server error'));
        }
      });
      renderListings();
    } catch (error) {
      if (disposed || current.signal.aborted) {
        return;
      }
      connectionStatus.textContent = 'Server unavailable';
      showError(error);
      renderListings();
    }
  }
  server.input.addEventListener('change', () => {
    void connectLobby();
  });
  void connectLobby();
  return {
    dispose() {
      disposed = true;
      remember();
      attempt?.abort();
      if (lobby) {
        lobby.reconnection.enabled = false;
        void lobby.leave().catch(() => {});
      }
      screen.remove();
    },
  };
}
