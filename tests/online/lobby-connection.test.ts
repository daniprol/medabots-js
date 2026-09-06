import { Client, Room } from '@colyseus/sdk';
import { describe, expect, it, vi } from 'vitest';

import { LobbyConnection } from '../../src/online/lobby-connection';

function lobbyRoom() {
  const room = new Room('lobby');
  const messages = new Map<string | number, (value: unknown) => void>();
  vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
    messages.set(type, callback);
    return () => {
      messages.delete(type);
    };
  });
  const leave = vi.spyOn(room, 'leave').mockResolvedValue(1000);
  return { room, leave, send: (type: string, value: unknown) => messages.get(type)?.(value) };
}
function listing(roomId: string) {
  return {
    roomId,
    clients: 1,
    maxClients: 2,
    metadata: {
      arenaId: 'arena',
      teamSize: 1,
      hostName: 'Host',
      phase: 'waiting',
      protocolVersion: 1,
      contentHash: 'hash',
    },
  };
}

describe('lobby connection lifecycle', () => {
  it('ignores stale messages and disconnects after switching servers', async () => {
    const old = lobbyRoom();
    const current = lobbyRoom();
    const client = new Client('http://localhost:2567');
    vi.spyOn(client, 'joinOrCreate')
      .mockResolvedValueOnce(old.room)
      .mockResolvedValueOnce(current.room);
    const changed = vi.fn();
    const connection = new LobbyConnection(changed);
    await connection.connect(client);
    old.send('rooms', [listing('old')]);
    expect([...connection.rooms.keys()]).toEqual(['old']);
    await connection.connect(client);
    expect(old.leave).toHaveBeenCalledOnce();
    current.send('rooms', [listing('current')]);
    const calls = changed.mock.calls.length;
    old.send('rooms', [listing('stale')]);
    old.send('+', ['stale', listing('stale')]);
    old.send('-', 'current');
    old.room.onDrop.invoke(1006);
    expect([...connection.rooms.keys()]).toEqual(['current']);
    expect(connection.status).toBe('connected');
    expect(changed).toHaveBeenCalledTimes(calls);
    connection.dispose();
  });

  it('rejects malformed listings and disables the lobby on a connection drop', async () => {
    const transport = lobbyRoom();
    const client = new Client('http://localhost:2567');
    vi.spyOn(client, 'joinOrCreate').mockResolvedValue(transport.room);
    const connection = new LobbyConnection(() => {});
    await connection.connect(client);
    expect(transport.room.reconnection.enabled).toBe(false);
    transport.send('rooms', null);
    transport.send('rooms', [null, {}, listing('valid'), { ...listing('bad'), clients: -1 }]);
    transport.send('+', ['mismatched', listing('other')]);
    transport.send('+', null);
    expect([...connection.rooms.keys()]).toEqual(['valid']);
    transport.room.onDrop.invoke(1006);
    expect(connection.status).toBe('closed');
    expect(connection.rooms.size).toBe(0);
    transport.send('rooms', [listing('late')]);
    expect(connection.rooms.size).toBe(0);
    connection.dispose();
  });

  it('clears the old server when a replacement address cannot be used', async () => {
    const transport = lobbyRoom();
    const client = new Client('http://localhost:2567');
    vi.spyOn(client, 'joinOrCreate').mockResolvedValue(transport.room);
    const connection = new LobbyConnection(() => {});
    await connection.connect(client);
    transport.send('rooms', [listing('old-server')]);
    connection.disconnect();
    expect(connection.status).toBe('closed');
    expect(connection.rooms.size).toBe(0);
    expect(transport.leave).toHaveBeenCalledOnce();
    transport.send('rooms', [listing('stale')]);
    expect(connection.rooms.size).toBe(0);
    await connection.connect(client);
    expect(connection.status).toBe('connected');
    connection.dispose();
  });

  it('leaves a late join after its screen is disposed', async () => {
    const transport = lobbyRoom();
    const client = new Client('http://localhost:2567');
    let resolveJoin: (room: Room) => void = () => {};
    vi.spyOn(client, 'joinOrCreate').mockReturnValue(
      new Promise<Room>((resolve) => {
        resolveJoin = resolve;
      }),
    );
    const changed = vi.fn();
    const connection = new LobbyConnection(changed);
    const pending = connection.connect(client);
    connection.dispose();
    resolveJoin(transport.room);
    await pending;
    expect(transport.leave).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledOnce();
    expect(connection.rooms.size).toBe(0);
  });
});
