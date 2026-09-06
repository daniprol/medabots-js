import { randomInt } from 'node:crypto';

import { Room, ServerError, type Client } from '@colyseus/core';

import {
  createBattle,
  emptyCommand,
  type Battle,
  type BattleSetup,
  type CombatantCommand,
  type BattleEvent,
} from '../src/battle-core';
import type { ContentCatalog } from '../src/content/catalog';
import type { OnlineConfig } from '../src/online/config';
import {
  BattleInput,
  copyCommand,
  heldCommand,
  parseCreateOptions,
  parseJoinOptions,
  type BattleListing,
} from '../src/online/protocol';
import { BattleRoomState, NetworkBattle, OnlinePlayer } from '../src/online/state';
import { syncBattle } from '../src/online/state-adapter';

/** Server dependencies are closed over, never merged with client matchmaking options. */
export function battleRoomType(content: ContentCatalog, config: OnlineConfig, hash: string) {
  return class BattleRoom extends Room<{
    state: BattleRoomState;
    input: BattleInput;
    client: Client<{ messages: { events: BattleEvent[] } }>;
    metadata: BattleListing;
  }> {
    state = new BattleRoomState();
    inputs = this.defineInput(BattleInput, {
      bufferMaxSize: config.inputBufferSize,
      sanitize: { moveX: [-1, 1] },
    });
    private battle?: Battle;
    private held = new Map<string, { command: CombatantCommand; at: number }>();
    private countdownMs = 0;
    private finishedMs = 0;
    private waitingMs = 0;
    private preparingMs = 0;

    onCreate(options: unknown) {
      let selected;
      try {
        selected = parseCreateOptions(options, content, config.protocolVersion, hash);
      } catch (error) {
        throw new ServerError(400, error instanceof Error ? error.message : 'Invalid battle');
      }
      this.maxClients = selected.teamSize * 2;
      this.maxMessagesPerSecond = config.maxMessagesPerSecond;
      this.patchRate = 1000 / config.patchHz;
      Object.assign(this.state, {
        arenaId: selected.arenaId,
        teamSize: selected.teamSize,
        inputHz: config.inputHz,
        simulationHz: config.simulationHz,
        patchHz: config.patchHz,
      });
      this.metadata = {
        arenaId: selected.arenaId,
        teamSize: selected.teamSize,
        hostName: selected.name.trim(),
        phase: 'waiting',
        protocolVersion: config.protocolVersion,
        contentHash: hash,
      };
      this.onMessage('ready', (client, value: unknown) => {
        if (value !== true || this.state.phase !== 'waiting') {
          return;
        }
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.ready = true;
        }
      });
      this.onMessage('loaded', (client, value: unknown) => {
        const player = this.state.players.get(client.sessionId);
        if (value === true && player && this.state.phase === 'preparing') {
          player.loaded = true;
        }
      });
      this.setFixedTimestep((ctx) => this.step(ctx.dtMs), config.simulationHz);
    }

    onAuth(_client: Client, options: unknown) {
      try {
        return parseJoinOptions(options, content, config.protocolVersion, hash);
      } catch (error) {
        throw new ServerError(400, error instanceof Error ? error.message : 'Invalid player');
      }
    }

    onJoin(client: Client, options: unknown) {
      if (this.state.phase !== 'waiting') {
        throw new ServerError(409, 'This battle has already started.');
      }
      const player = parseJoinOptions(options, content, config.protocolVersion, hash);
      const slots = Array.from(
        { length: this.maxClients },
        (_, index) => `${index % 2 === 0 ? 'A' : 'B'}${Math.floor(index / 2) + 1}`,
      );
      const occupied = new Set(Array.from(this.state.players.values(), (p) => p.combatantId));
      const combatantId = slots.find((id) => !occupied.has(id));
      if (!combatantId) {
        throw new ServerError(409, 'This battle is full.');
      }
      this.state.players.set(
        client.sessionId,
        new OnlinePlayer({
          name: player.name,
          characterId: player.characterId,
          combatantId,
          teamId: combatantId.startsWith('A') ? 'team-a' : 'team-b',
          connected: true,
          ready: false,
        }),
      );
    }

    onDrop(client: Client) {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.connected = false;
      }
      this.clearInput(client.sessionId);
      this.allowReconnection(client, config.reconnectionSeconds);
    }

    onReconnect(client: Client) {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.connected = true;
      }
      this.clearInput(client.sessionId);
    }

    onLeave(client: Client) {
      this.clearInput(client.sessionId);
      if (this.state.phase === 'waiting') {
        this.state.players.delete(client.sessionId);
        this.cancelCountdown();
      } else if (['preparing', 'countdown', 'fighting'].includes(this.state.phase)) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.connected = false;
        }
        this.state.phase = 'abandoned';
        this.state.notice = `${player?.name ?? 'A player'} left the battle. Return to the server browser to play again.`;
        this.publishPhase();
      }
    }

    private clearInput(sessionId: string) {
      this.inputs.get(sessionId).clear();
      this.held.delete(sessionId);
    }

    private publishPhase() {
      void this.setMetadata({ ...this.metadata, phase: this.state.phase }).catch((error) =>
        console.error('Unable to update room listing', error),
      );
    }

    private cancelCountdown() {
      if (this.state.phase === 'countdown') {
        this.state.phase = 'preparing';
        this.state.countdown = 0;
        this.countdownMs = 0;
        this.publishPhase();
        if (this.state.players.size < this.maxClients) {
          void this.unlock();
        }
      }
    }

    private prepareBattle() {
      const setup: BattleSetup = {
        arenaId: this.state.arenaId,
        rulesId: config.defaultRulesId,
        seed: randomInt(0x100000000),
        teams: ['team-a', 'team-b'].map((id) => ({
          id,
          combatants: Array.from(this.state.players.values())
            .filter((player) => player.teamId === id)
            .sort((a, b) => a.combatantId.localeCompare(b.combatantId))
            .map((player) => ({
              instanceId: player.combatantId,
              characterId: player.characterId,
              role: player.combatantId.endsWith('1') ? ('leader' as const) : ('partner' as const),
            })),
        })),
      };
      this.battle = createBattle({ setup, content });
      this.state.battle = new NetworkBattle();
      syncBattle(this.state.battle, this.battle.getSnapshot());
      for (const sessionId of this.state.players.keys()) {
        this.clearInput(sessionId);
      }
      this.state.phase = 'preparing';
      void this.lock();
      this.publishPhase();
    }

    private step(deltaMs: number) {
      if (['waiting', 'preparing', 'countdown'].includes(this.state.phase)) {
        for (const id of this.state.players.keys()) {
          this.clearInput(id);
        }
        if (this.state.phase === 'waiting') {
          this.waitingMs += deltaMs;
          if (this.waitingMs >= config.waitingRoomSeconds * 1000) {
            this.state.phase = 'abandoned';
            this.state.notice = 'Waiting room expired.';
            this.publishPhase();
            return;
          }
          if (
            this.state.players.size === this.maxClients &&
            Array.from(this.state.players.values()).every(
              (player) => player.connected && player.ready,
            )
          ) {
            this.prepareBattle();
          }
          return;
        }
        this.preparingMs += deltaMs;
        if (this.preparingMs > config.preparationTimeoutMs + config.countdownSeconds * 1000) {
          this.state.phase = 'abandoned';
          this.state.notice = 'A player could not finish loading the arena. Please try again.';
          this.publishPhase();
          return;
        }
        if (
          !Array.from(this.state.players.values()).every(
            (player) => player.connected && player.loaded,
          )
        ) {
          this.cancelCountdown();
          return;
        }
        if (this.state.phase === 'preparing') {
          this.state.phase = 'countdown';
          this.countdownMs = config.countdownSeconds * 1000;
          this.publishPhase();
        }
        this.countdownMs -= deltaMs;
        this.state.countdown = Math.max(0, Math.ceil(this.countdownMs / 1000));
        if (this.countdownMs <= 0) {
          this.state.phase = 'fighting';
          this.publishPhase();
        }
        return;
      }
      if (this.state.phase !== 'fighting') {
        this.finishedMs += deltaMs;
        if (this.finishedMs >= config.finishedRoomSeconds * 1000) {
          void this.disconnect();
        }
        return;
      }
      const battle = this.battle!;
      const commands: Record<string, CombatantCommand> = {};
      for (const [sessionId, player] of this.state.players) {
        const input = player.connected ? this.inputs.get(sessionId).next() : undefined;
        if (input) {
          this.held.set(sessionId, { command: heldCommand(input), at: this.clock.elapsedTime });
        }
        const previous = this.held.get(sessionId);
        commands[player.combatantId] = !player.connected
          ? emptyCommand()
          : input
            ? copyCommand(input)
            : previous && this.clock.elapsedTime - previous.at < config.inputTimeoutMs
              ? previous.command
              : emptyCommand();
      }
      battle.step({ tick: this.state.battle!.tick + 1, commands });
      const snapshot = battle.getSnapshot();
      syncBattle(this.state.battle!, snapshot);
      const events = battle.drainEvents();
      if (events.length) {
        this.broadcast('events', events, { afterNextPatch: true });
      }
      if (snapshot.result) {
        this.state.phase = 'complete';
        this.publishPhase();
      }
    }
  };
}
export type BattleRoom = InstanceType<ReturnType<typeof battleRoomType>>;
