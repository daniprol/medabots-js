import { createHash } from 'node:crypto';

import { Encoder, Decoder } from '@colyseus/schema';
import { describe, expect, it, vi } from 'vitest';

import { createBattle, emptyCommand } from '../../src/battle-core';
import { ONLINE_CONFIG, validateOnlineConfig } from '../../src/online/config';
import { contentHash, contentIdentity } from '../../src/online/content-identity';
import { copyCommand, heldCommand, parseCreateOptions } from '../../src/online/protocol';
import { normalizeServerUrl, readServers } from '../../src/online/server-addresses';
import { SnapshotBuffer } from '../../src/online/snapshot-buffer';
import { NetworkBattle } from '../../src/online/state';
import { readBattle, syncBattle } from '../../src/online/state-adapter';
import { content, setup } from '../helpers';

describe('online boundaries', () => {
  it('round-trips battle state through real schema full state and binary patches', () => {
    const battle = createBattle({ setup, content });
    const network = new NetworkBattle();
    syncBattle(network, battle.getSnapshot());
    const encoder = new Encoder(network);
    const decoded = new NetworkBattle();
    const decoder = new Decoder(decoded);
    decoder.decode(encoder.encodeAll());
    encoder.discardChanges();
    expect(readBattle(decoded)).toEqual(battle.getSnapshot());
    const originalActor = network.combatants.get('A1');
    for (let tick = 1; tick <= 100; tick++) {
      battle.step({
        tick,
        commands: Object.fromEntries(
          battle.getSnapshot().combatants.map((actor) => [
            actor.id,
            {
              ...emptyCommand(),
              moveX: actor.teamId === 'team-a' ? 1 : -1,
              jumpPressed: tick === 2,
              jumpHeld: tick < 20,
              rightArmPressed: tick === 80,
              attackHeld: tick >= 80,
            },
          ]),
        ),
      });
      syncBattle(network, battle.getSnapshot());
      decoder.decode(encoder.encode());
      encoder.discardChanges();
      expect(readBattle(decoded)).toEqual(battle.getSnapshot());
    }
    expect(network.combatants.get('A1')).toBe(originalActor);
  });

  it('fingerprints the same content in Node and insecure browser contexts', async () => {
    const expected = createHash('sha256').update(contentIdentity(content)).digest('hex');
    vi.stubGlobal('crypto', undefined);
    try {
      expect(await contentHash(content)).toBe(expected);
      expect(
        await contentHash({
          ...content,
          characters: Object.fromEntries(Object.entries(content.characters).reverse()),
        }),
      ).toBe(expected);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('holds axes and buttons without repeating tap edges or remote AI orders', () => {
    const input = {
      ...emptyCommand(),
      moveX: 1 as const,
      jumpHeld: true,
      jumpPressed: true,
      rightArmPressed: true,
      strategyPressed: true,
    };
    expect(copyCommand(input).jumpPressed).toBe(true);
    expect(heldCommand(input)).toEqual({ ...emptyCommand(), moveX: 1, jumpHeld: true });
    expect(input.jumpPressed).toBe(true);
  });

  it('rejects invalid creation, content mismatches and incompatible rates', () => {
    const options = {
      name: 'Fighter',
      characterId: Object.keys(content.characters)[0]!,
      arenaId: setup.arenaId,
      teamSize: 2,
      protocolVersion: ONLINE_CONFIG.protocolVersion,
      contentHash: 'a'.repeat(64),
    };
    expect(
      parseCreateOptions(options, content, ONLINE_CONFIG.protocolVersion, 'a'.repeat(64)).teamSize,
    ).toBe(2);
    for (const change of [
      { teamSize: 4 },
      { characterId: '__proto__' },
      { arenaId: 'missing' },
      { name: ' ' },
      { protocolVersion: 999 },
      { contentHash: 'b'.repeat(64) },
    ]) {
      expect(() =>
        parseCreateOptions(
          { ...options, ...change },
          content,
          ONLINE_CONFIG.protocolVersion,
          'a'.repeat(64),
        ),
      ).toThrow();
    }
    expect(() => validateOnlineConfig({ ...ONLINE_CONFIG, inputHz: 120 })).toThrow();
    expect(() => validateOnlineConfig({ ...ONLINE_CONFIG, simulationHz: 0 })).toThrow();
  });

  it('normalizes addresses and handles corrupt storage without losing localhost', () => {
    expect(normalizeServerUrl(' ws://localhost:2567/ ')).toBe('http://localhost:2567');
    expect(normalizeServerUrl('wss://example.org/game/')).toBe('https://example.org/game');
    for (const address of [
      'localhost:2567',
      'ftp://example.org',
      'https://user:secret@example.org',
      'https://example.org?token=abc',
    ]) {
      expect(() => normalizeServerUrl(address)).toThrow();
    }
    expect(() => normalizeServerUrl('http://localhost:2567', 'https:')).toThrow();
    expect(readServers({ getItem: () => '{' })).toEqual(ONLINE_CONFIG.servers);
  });

  it('interpolates by actual tick gaps, ignores duplicate/old patches and freezes on stalls', () => {
    const snapshot = createBattle({ setup, content }).getSnapshot();
    const buffer = new SnapshotBuffer(60, 100, 3);
    buffer.push({ ...snapshot, tick: 0 }, 1000);
    buffer.push({ ...snapshot, tick: 6 }, 1100);
    buffer.push({ ...snapshot, tick: 12 }, 1200);
    buffer.push({ ...snapshot, tick: 6 }, 1220);
    const sample = buffer.sample(1250)!;
    expect(sample.previous.tick).toBe(6);
    expect(sample.current.tick).toBe(12);
    expect(sample.alpha).toBeCloseTo(0.5);
    expect(buffer.sample(9999)!.current.tick).toBe(12);
    buffer.clear();
    expect(buffer.sample(10000)).toBeNull();
  });
});
