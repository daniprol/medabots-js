import { Value } from '@sinclair/typebox/value';

import type { ContentCatalog } from '../content/catalog';
import {
  KeyboardSchema,
  GamepadSchema,
  INPUT_ACTIONS,
  type KeyboardDefinition,
  type GamepadDefinition,
} from '../content/schemas';

export function replaceControlProfile(
  content: ContentCatalog,
  profile: KeyboardDefinition | GamepadDefinition,
): ContentCatalog {
  const schema = profile.kind === 'keyboard' ? KeyboardSchema : GamepadSchema;
  const errors = [...Value.Errors(schema, profile)];

  if (errors.length) {
    throw new Error(
      errors.map((e) => `${e.path}: ${e.message}; received ${JSON.stringify(e.value)}`).join('\n'),
    );
  }

  if (profile.kind === 'keyboard') {
    const owners = new Map<string, string>();

    for (const action of INPUT_ACTIONS) {
      for (const code of profile.bindings[action]) {
        const prior = owners.get(code);

        if (prior && prior !== action) {
          throw new Error(`${code} is already assigned to ${prior}. Choose a different key.`);
        }

        owners.set(code, action);
      }
    }
  } else if (profile.activationThreshold <= profile.deadzone) {
    throw new Error('Stick activation threshold must be greater than its deadzone.');
  }

  const field = profile.kind === 'keyboard' ? 'keyboards' : 'gamepads';

  return { ...content, [field]: { ...content[field], [profile.id]: structuredClone(profile) } };
}
