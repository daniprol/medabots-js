import { matchMaker } from '@colyseus/core';
import { Client, type Room } from '@colyseus/sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BattleRoom } from '../../server/battle-room';
import { serverConfig } from '../../server/config';
import { createOnlineServer } from '../../server/create-server';
import { emptyCommand } from '../../src/battle-core';
import { ONLINE_CONFIG } from '../../src/online/config';
import { BattleInput, type CreateBattleOptions } from '../../src/online/protocol';
import { content, setup } from '../helpers';

type BattleClient = Room<BattleRoom>;
let running: Awaited<ReturnType<typeof createOnlineServer>>;
let client: Client;
let options: CreateBattleOptions;
const opened: BattleClient[] = [];

async function until(condition: () => boolean, message = 'room update', timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
async function create(teamSize: 1 | 2 | 3 = 1) {
  const room = await client.create<BattleRoom>('battle', { ...options, teamSize });
  opened.push(room);
  room.onMessage('events', () => {});
  await until(() => room.state.players?.size === 1);
  return room;
}
async function join(room: BattleClient, name = 'Guest') {
  const joined = await client.joinById<BattleRoom>(room.roomId, { ...options, name });
  opened.push(joined);
  joined.onMessage('events', () => {});
  await until(() => joined.state.players?.has(joined.sessionId) === true);
  return joined;
}
async function start(rooms: BattleClient[]) {
  for (const room of rooms) {
    room.send('ready', true);
  }
  await until(() => rooms.every((room) => room.state.phase === 'preparing'), 'arena preparation');
  expect(rooms[0]!.state.battle!.tick).toBe(0);
  for (const room of rooms) {
    room.send('loaded', true);
  }
  await until(() => rooms.every((room) => room.state.phase === 'fighting'), 'battle start');
}

beforeAll(async () => {
  running = await createOnlineServer(
    {
      ...content,
      rules: Object.fromEntries(
        Object.entries(content.rules).map(([id, rule]) => [id, { ...rule, roundTicks: 90 }]),
      ),
    },
    { ...ONLINE_CONFIG, countdownSeconds: 0.1, reconnectionSeconds: 0.3 },
    serverConfig(),
  );
  await running.server.listen(0, '127.0.0.1');
  const address = running.http.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP listener');
  }
  client = new Client(`http://127.0.0.1:${address.port}`);
  options = {
    name: 'Host',
    characterId: Object.keys(content.characters)[0]!,
    arenaId: setup.arenaId,
    teamSize: 1,
    protocolVersion: ONLINE_CONFIG.protocolVersion,
    contentHash: running.hash,
  };
});
afterAll(async () => {
  await Promise.all(
    opened.map((room) => {
      room.reconnection.enabled = false;
      return room.connection.isOpen ? room.leave().catch(() => {}) : Promise.resolve();
    }),
  );
  await running.server.gracefullyShutdown(false);
});

describe('authoritative Colyseus rooms with real WebSocket clients', () => {
  it.each([1, 2, 3] as const)(
    'fills size-%s teams, waits for readiness, rejects extra seats, and isolates player input',
    async (size) => {
      const host = await create(size);
      expect(host.state.phase).toBe('waiting');
      const rooms = [host];
      for (let index = 1; index < size * 2; index++) {
        rooms.push(await join(host, `Guest ${index}`));
      }
      await until(() => host.state.players.size === size * 2);
      expect(
        new Set(Array.from(host.state.players.values(), (player) => player.combatantId)).size,
      ).toBe(size * 2);
      expect(
        Array.from(host.state.players.values()).filter((p) => p.teamId === 'team-a'),
      ).toHaveLength(size);
      await expect(client.joinById(host.roomId, options)).rejects.toThrow();
      await start(rooms);
      const inputs = rooms.map((room) => room.input({ type: BattleInput }));
      const hostActor = host.state.players.get(host.sessionId)!.combatantId;
      const before = host.state.battle!.combatants.get(hostActor)!.movement.x;
      Object.assign(inputs[0]!.data, emptyCommand(), { moveX: 1 });
      inputs[0]!.send();
      await until(
        () => host.state.battle!.combatants.get(hostActor)!.movement.x > before,
        'owned movement',
      );
      await until(
        () => host.state.battle!.combatants.get(hostActor)!.movement.vx === 0,
        'stale input release',
      );
      const tick = host.state.battle!.tick;
      host.send('ready', true);
      await until(() => host.state.battle!.tick > tick + 5);
      await Promise.all(rooms.map((room) => room.leave()));
    },
  );

  it('does not advance before every renderer loads, and keeps the final result authoritative', async () => {
    const host = await create();
    const guest = await join(host);
    host.send('ready', true);
    guest.send('ready', true);
    await until(() => host.state.phase === 'preparing');
    host.send('loaded', true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(host.state.battle!.tick).toBe(0);
    expect(host.state.phase).toBe('preparing');
    guest.send('loaded', true);
    await until(() => host.state.phase === 'complete', 'timeout result');
    await until(() => guest.state.phase === 'complete');
    expect(host.state.battle!.resultReason).toBe(guest.state.battle!.resultReason);
    expect(host.state.battle!.tick).toBe(90);
    const final = host.state.battle!.toJSON();
    const input = host.input({ type: BattleInput });
    Object.assign(input.data, emptyCommand(), { moveX: 1 });
    input.send();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(host.state.battle!.toJSON()).toEqual(final);
    await Promise.all([host.leave(), guest.leave()]);
  });

  it('releases a waiting seat without changing the other player’s identity', async () => {
    const host = await create();
    const guest = await join(host);
    const hostId = host.state.players.get(host.sessionId)!.combatantId;
    const guestId = guest.state.players.get(guest.sessionId)!.combatantId;
    await guest.leave();
    await until(() => host.state.players.size === 1);
    const replacement = await join(host, 'Replacement');
    expect(replacement.state.players.get(replacement.sessionId)!.combatantId).toBe(guestId);
    expect(host.state.players.get(host.sessionId)!.combatantId).toBe(hostId);
    await Promise.all([host.leave(), replacement.leave()]);
  });

  it('lists waiting rooms and removes them after disposal', async () => {
    const lobby = await client.joinOrCreate('lobby', { filter: { name: 'battle' } });
    const ids = new Set<string>();
    lobby.onMessage<{ roomId: string }[]>('rooms', (rooms) => {
      for (const room of rooms) {
        ids.add(room.roomId);
      }
    });
    lobby.onMessage<[string, unknown]>('+', ([id]) => {
      ids.add(id);
    });
    lobby.onMessage<string>('-', (id) => {
      ids.delete(id);
    });
    const host = await create();
    await until(() => ids.has(host.roomId), 'live listing');
    await host.leave();
    await until(() => !ids.has(host.roomId), 'removed listing');
    await lobby.leave();
  });

  it('rejects incompatible content and does not let client options replace server rules', async () => {
    await expect(
      client.create('battle', { ...options, contentHash: '0'.repeat(64) }),
    ).rejects.toThrow(/differs/);
    await expect(client.create('battle', { ...options, teamSize: 9 })).rejects.toThrow();
    const host = await create();
    await expect(
      client.joinById(host.roomId, { ...options, characterId: '__proto__' }),
    ).rejects.toThrow();
    const guest = await join(host);
    await start([host, guest]);
    expect(host.state.battle!.rulesId).toBe(ONLINE_CONFIG.defaultRulesId);
    await Promise.all([host.leave(), guest.leave()]);
  });

  it('holds a disconnected seat, reconnects the same combatant, then ends on grace expiry', async () => {
    const host = await create();
    const guest = await join(host);
    await start([host, guest]);
    guest.reconnection.enabled = false;
    const original = guest.state.players.get(guest.sessionId)!.combatantId;
    const token = guest.reconnectionToken;
    guest.connection.close(4001);
    await until(() => host.state.players.get(guest.sessionId)?.connected === false, 'drop');
    const rejoined = await client.reconnect<BattleRoom>(token);
    opened.push(rejoined);
    rejoined.onMessage('events', () => {});
    await until(() => rejoined.state.players?.get(rejoined.sessionId)?.connected === true);
    expect(rejoined.state.players.get(rejoined.sessionId)!.combatantId).toBe(original);
    rejoined.reconnection.enabled = false;
    rejoined.connection.close(4001);
    await until(() => host.state.phase === 'abandoned', 'reconnect expiry');
    expect(host.state.notice).toContain('left');
    await host.leave();
  });

  it('consumes at most one input per player per simulation step even during bursts', async () => {
    const host = await create();
    const guest = await join(host);
    await start([host, guest]);
    const room = matchMaker.getLocalRoomById(host.roomId)!;
    const input = host.input({ type: BattleInput });
    Object.assign(input.data, emptyCommand(), { moveX: 127 });
    const tick = host.state.battle!.tick;
    for (let index = 0; index < 40; index++) {
      input.send();
    }
    await until(() => room.inputs!.get(host.sessionId).consumedCount >= 40, 'bounded burst');
    expect(host.state.battle!.tick - tick).toBeLessThan(35);
    expect(room.inputs!.get(host.sessionId).latest!.moveX).toBe(1);
    await Promise.all([host.leave(), guest.leave()]);
  });
});
