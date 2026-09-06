import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import settings from '../../config/online.json';

const positive = (maximum: number) => Type.Number({ exclusiveMinimum: 0, maximum });
export const OnlineConfigSchema = Type.Object(
  {
    protocolVersion: Type.Integer({ minimum: 1 }),
    simulationHz: positive(120),
    inputHz: positive(120),
    patchHz: positive(120),
    inputBufferSize: Type.Integer({ minimum: 1, maximum: 64 }),
    inputTimeoutMs: positive(5000),
    reconnectionSeconds: positive(120),
    countdownSeconds: positive(30),
    preparationTimeoutMs: positive(120000),
    waitingRoomSeconds: positive(86400),
    finishedRoomSeconds: positive(3600),
    maxMessagesPerSecond: Type.Integer({ minimum: 1, maximum: 1000 }),
    interpolationDelayMs: positive(1000),
    maxSnapshotBuffer: Type.Integer({ minimum: 2, maximum: 120 }),
    maxPendingEvents: Type.Integer({ minimum: 1, maximum: 4096 }),
    connectionTimeoutMs: positive(60000),
    defaultRulesId: Type.String({ minLength: 1 }),
    servers: Type.Array(Type.Object({ name: Type.String(), url: Type.String() })),
  },
  { additionalProperties: false },
);

export function validateOnlineConfig(value: unknown) {
  if (!Value.Check(OnlineConfigSchema, value)) {
    throw new Error(
      'Invalid config/online.json: ' +
        [...Value.Errors(OnlineConfigSchema, value)]
          .map((e) => `${e.path} ${e.message}`)
          .join('; '),
    );
  }
  if (value.inputHz > value.simulationHz || value.patchHz > value.simulationHz) {
    throw new Error('Input and patch rates must not exceed simulationHz');
  }
  if (value.inputTimeoutMs < 2000 / value.inputHz) {
    throw new Error('inputTimeoutMs must allow at least two input intervals');
  }
  return value;
}
export const ONLINE_CONFIG = validateOnlineConfig(settings);
export type OnlineConfig = typeof ONLINE_CONFIG;
