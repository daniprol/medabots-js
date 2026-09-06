import type { Client } from '@colyseus/sdk';
import { type Room } from '@colyseus/sdk';

import type { BattleRoom } from '../../server/battle-room';
import type { BattleEvent, BattleSnapshot } from '../battle-core';
import { ONLINE_CONFIG } from './config';
import { BATTLE_ROOM, type CreateBattleOptions, type JoinBattleOptions } from './protocol';
import { readBattle } from './state-adapter';

export type OnlineRoom = Room<BattleRoom>;

/** A late successful join is left immediately if its screen was disposed or timed out. */
export async function connectBattle(
  client: Client,
  options: CreateBattleOptions | JoinBattleOptions,
  roomId: string | undefined,
  signal: AbortSignal,
): Promise<OnlineRoom> {
  const pending = roomId
    ? client.joinById<BattleRoom>(roomId, options)
    : client.create<BattleRoom>(BATTLE_ROOM, options);
  const room = await boundedConnection(pending, signal);
  try {
    if (!room.state.players?.has(room.sessionId)) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          room.onStateChange.remove(state);
          room.onLeave.remove(closed);
          signal.removeEventListener('abort', closed);
        };
        const state = () => {
          if (room.state.players?.has(room.sessionId)) {
            cleanup();
            resolve();
          }
        };
        const closed = () => {
          cleanup();
          reject(new Error('Battle connection closed before the room was ready.'));
        };
        const timer = setTimeout(closed, ONLINE_CONFIG.connectionTimeoutMs);
        room.onStateChange(state);
        room.onLeave(closed);
        signal.addEventListener('abort', closed, { once: true });
        if (signal.aborted) {
          closed();
        } else {
          state();
        }
      });
    }
    return room;
  } catch (error) {
    room.reconnection.enabled = false;
    void room.leave().catch(() => {});
    throw error;
  }
}

export function boundedConnection<T extends { leave: () => Promise<unknown> }>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let expired = false;
    const cancel = () => {
      expired = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(
        new Error('Connection cancelled or timed out. Check the server address and try again.'),
      );
    };
    const timer = setTimeout(cancel, ONLINE_CONFIG.connectionTimeoutMs);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
    }
    void pending.then(
      (room) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        if (expired) {
          void room.leave().catch(() => {});
        } else {
          resolve(room);
        }
      },
      (error: unknown) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}

export class BattleConnection {
  snapshot: BattleSnapshot | null = null;
  status: 'connected' | 'reconnecting' | 'closed' = 'connected';
  error = '';
  private events: BattleEvent[] = [];
  private listeners = new Set<() => void>();
  private disposed = false;
  private readonly onState = () => {
    if (this.room.state.battle) {
      this.snapshot = readBattle(this.room.state.battle);
    }
    this.notify();
  };
  constructor(readonly room: OnlineRoom) {
    room.reconnection.minUptime = 0;
    room.onStateChange(this.onState);
    room.onMessage('events', (events) => {
      this.events.push(...events.slice(-ONLINE_CONFIG.maxPendingEvents));
      this.events = this.events.slice(-ONLINE_CONFIG.maxPendingEvents);
    });
    room.onDrop(() => {
      this.status = 'reconnecting';
      this.events = [];
      this.notify();
    });
    room.onReconnect(() => {
      this.status = 'connected';
      this.notify();
    });
    room.onError((_code, message) => {
      this.error = message ?? 'Connection error';
      this.notify();
    });
    room.onLeave(() => {
      this.status = 'closed';
      this.notify();
    });
    this.onState();
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private notify() {
    if (!this.disposed) {
      for (const listener of this.listeners) {
        listener();
      }
    }
  }
  drainEvents(upToTick = Infinity) {
    const ready = this.events.filter((event) => event.tick <= upToTick);
    this.events = this.events.filter((event) => event.tick > upToTick);
    return ready;
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
    this.room.onStateChange.remove(this.onState);
    this.room.reconnection.enabled = false;
    void this.room.leave().catch(() => {});
  }
}
