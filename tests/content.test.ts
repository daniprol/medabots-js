import { parse } from 'jsonc-parser';
import { describe, it, expect } from 'vitest';

import { millisecondsToTicks } from '../src/battle-core/timing';
import { buildContentCatalog } from '../src/content/build-content-catalog';
import { documents, content, fixture } from './helpers';
describe('content pipeline', () => {
  it('discovers and validates all thirty complete characters, with frozen definitions', () => {
    expect(Object.keys(content.characters)).toHaveLength(30);
    expect(Object.isFrozen(content.parts['metabee-head'])).toBe(true);
    expect(content.abilities['metabee-head-attack']!.original.actionTicks).toBe(32);
  });
  it('parses comments and trailing commas', () => {
    const doc = documents.find((d) => d.path.endsWith('balanced.jsonc'))!;
    const others = documents.filter((d) => d !== doc);
    expect(() =>
      buildContentCatalog([
        ...others,
        { ...doc, text: JSON.stringify(parse(doc.text)).replace(/}$/, ', // trailing comma\n}') },
      ]),
    ).not.toThrow();
  });
  it.each(['unknown', 'constructor', 'toString'])(
    'rejects unregistered definition kind %s',
    (kind) => {
      expect(() =>
        buildContentCatalog([{ path: 'unknown.jsonc', text: JSON.stringify({ kind }) }]),
      ).toThrow(/unknown.jsonc \/kind: expected.*received/);
    },
  );

  it('rejects malformed JSONC with file and offset', () => {
    expect(() => buildContentCatalog([{ path: 'broken.jsonc', text: '{"kind": ,}' }])).toThrow(
      /broken.jsonc.*offset.*expected.*received/,
    );
  });
  it('reports property path, expected range and received value', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'part' && d.id === 'metabee-head') {
          d.armor = -4;
        }
      }),
    ).toThrow(/metabee.*\/armor.*expected.*received -4/);
  });
  it('rejects misspelled properties', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'part' && d.id === 'metabee-head') {
          d.armour = 50;
        }
      }),
    ).toThrow(/\/armour/);
  });
  it('rejects globally duplicate IDs', () => {
    expect(() =>
      buildContentCatalog([...documents, { path: 'duplicate.jsonc', text: documents[0]!.text }]),
    ).toThrow(/globally unique ID/);
  });
  it('rejects unknown abilities and wrong part slots', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'part' && d.id === 'metabee-head') {
          d.abilityId = 'missing-ability';
        }
      }),
    ).toThrow(/abilityId.*existing reference/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'character' && d.id === 'metabee') {
          d.defaultLoadout.head = 'metabee-legs';
        }
      }),
    ).toThrow(/defaultLoadout\/head.*slot head/);
  });
  it('requires abilities, movement, and valid special references', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'part' && d.id === 'metabee-head') {
          delete d.abilityId;
        }
      }),
    ).toThrow(/ability for head/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'part' && d.id === 'metabee-legs') {
          delete (d as Record<string, unknown>).speedIndex;
        }
      }),
    ).toThrow(/speedIndex/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'character' && d.id === 'metabee') {
          d.specialAbilityId = 'metabee-head-attack';
        }
      }),
    ).toThrow(/special ability/);
  });
  it('validates keyboard codes and gamepad indices/deadzone', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'keyboard' && d.id === 'keyboard-1') {
          d.bindings.jump = ['w'];
        }
      }),
    ).toThrow(/bindings\/jump\/0/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'gamepad') {
          d.bindings.jump = [32];
        }
      }),
    ).toThrow(/bindings\/jump\/0/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'gamepad') {
          d.deadzone = 0.8;
        }
      }),
    ).toThrow(/activationThreshold/);
  });
  it('rejects invalid match roles, instance IDs and out-of-bounds arenas', () => {
    expect(() =>
      fixture((d) => {
        if (d.kind === 'match') {
          d.teams[0]!.combatants[1]!.role = 'leader';
        }
      }),
    ).toThrow(/exactly one leader/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'match') {
          d.teams[1]!.combatants[0]!.instanceId = 'A1';
        }
      }),
    ).toThrow(/unique instance ID/);
    expect(() =>
      fixture((d) => {
        if (d.kind === 'arena') {
          d.spawns[0]!.x = 90;
        }
      }),
    ).toThrow(/spawn within arena/);
  });
  it('edits damage, armor, movement and bindings directly from JSONC', () => {
    const changed = fixture((d) => {
      if (d.kind === 'part' && d.id === 'metabee-head') {
        d.armor = 200;
      }
      if (d.kind === 'ability' && d.id === 'metabee-head-attack') {
        d.damage = 42;
      }
      if (d.kind === 'part' && d.id === 'metabee-legs') {
        d.speedIndex = 6;
      }
      if (d.kind === 'keyboard' && d.id === 'keyboard-1') {
        d.bindings.jump = ['Space', 'KeyW'];
      }
    });
    expect(changed.parts['metabee-head']!.armor).toBe(200);
    expect(changed.abilities['metabee-head-attack']!.damage).toBe(42);
    expect(changed.parts['metabee-legs']!.speedIndex).toBe(6);
    expect(changed.keyboards['keyboard-1']!.bindings.jump).toEqual(['Space', 'KeyW']);
  });
  it('rounds duration upward into exact 60Hz ticks', () => {
    expect([0, 1, 16, 17, 1000].map(millisecondsToTicks)).toEqual([0, 1, 1, 2, 60]);
  });
  it('does not mutate parsed source definitions', () => {
    expect(
      parse(documents.find((d) => d.path.endsWith('battle-rules.jsonc'))!.text).roundTicks,
    ).toBeUndefined();
  });
});
