import type { Client, Room } from '@colyseus/sdk';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { boundedConnection } from './battle-connection';
import { BATTLE_ROOM, LOBBY_ROOM } from './protocol';

const ListingSchema = Type.Object({
  roomId: Type.String({ minLength: 1 }),
  clients: Type.Integer({ minimum: 0 }),
  maxClients: Type.Integer({ minimum: 1 }),
  metadata: Type.Object({
    arenaId: Type.String(),
    teamSize: Type.Integer({ minimum: 1, maximum: 3 }),
    hostName: Type.String(),
    phase: Type.String(),
    protocolVersion: Type.Integer(),
    contentHash: Type.String(),
  }),
});
type Listing = Static<typeof ListingSchema>;

/** Owns one live listing subscription; old rooms cannot update a replacement. */
export class LobbyConnection {
  readonly rooms = new Map<string, Listing>();
  status: 'connecting' | 'connected' | 'closed' = 'closed';
  error = '';
  private room: Room | undefined;
  private attempt: AbortController | undefined;
  private disposed = false;

  constructor(private readonly onChange: () => void) {}

  async connect(client: Client) {
    this.release();
    if (this.disposed) {
      return;
    }
    const attempt = new AbortController();
    this.attempt = attempt;
    this.status = 'connecting';
    this.error = '';
    this.onChange();
    try {
      const room = await boundedConnection(
        client.joinOrCreate(LOBBY_ROOM, { filter: { name: BATTLE_ROOM } }),
        attempt.signal,
      );
      if (this.disposed || attempt.signal.aborted) {
        void room.leave().catch(() => {});
        return;
      }
      this.room = room;
      // Built-in LobbyRoom does not retain reconnecting seats. Refresh joins a new lobby.
      room.reconnection.enabled = false;
      this.status = 'connected';
      const update = (change: () => void) => {
        if (!this.disposed && this.room === room && this.status === 'connected') {
          change();
          this.onChange();
        }
      };
      room.onMessage<unknown>('rooms', (value) =>
        update(() => {
          this.rooms.clear();
          if (Array.isArray(value)) {
            for (const entry of value) {
              if (Value.Check(ListingSchema, entry)) {
                this.rooms.set(entry.roomId, entry);
              }
            }
          }
        }),
      );
      room.onMessage<unknown>('+', (value) =>
        update(() => {
          if (
            Array.isArray(value) &&
            value.length === 2 &&
            Value.Check(ListingSchema, value[1]) &&
            value[0] === value[1].roomId
          ) {
            this.rooms.set(value[1].roomId, value[1]);
          }
        }),
      );
      room.onMessage<unknown>('-', (value) =>
        update(() => {
          if (typeof value === 'string') {
            this.rooms.delete(value);
          }
        }),
      );
      const closed = () =>
        update(() => {
          this.status = 'closed';
          this.rooms.clear();
        });
      room.onDrop(closed);
      room.onLeave(closed);
      room.onError((_code, message) =>
        update(() => {
          this.error = message ?? 'Server error';
        }),
      );
      this.onChange();
    } catch (error) {
      if (!this.disposed && !attempt.signal.aborted) {
        this.status = 'closed';
        this.error = error instanceof Error ? error.message : String(error);
        this.onChange();
      }
    }
  }

  private release() {
    this.attempt?.abort();
    const room = this.room;
    this.room = undefined;
    this.rooms.clear();
    if (room) {
      room.reconnection.enabled = false;
      void room.leave().catch(() => {});
    }
  }

  disconnect() {
    this.release();
    this.status = 'closed';
    this.error = '';
    if (!this.disposed) {
      this.onChange();
    }
  }

  dispose() {
    this.disposed = true;
    this.release();
  }
}
