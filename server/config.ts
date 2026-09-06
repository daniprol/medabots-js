import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import settings from '../config/server.json';

const ServerConfigSchema = Type.Object(
  {
    host: Type.String({ minLength: 1 }),
    port: Type.Integer({ minimum: 1, maximum: 65535 }),
    maxPayloadBytes: Type.Integer({ minimum: 128, maximum: 65536 }),
    pingIntervalMs: Type.Integer({ minimum: 100, maximum: 60000 }),
    pingMaxRetries: Type.Integer({ minimum: 1, maximum: 20 }),
    allowedOrigins: Type.Array(Type.String(), { minItems: 1 }),
  },
  { additionalProperties: false },
);
export function serverConfig() {
  const config = {
    ...settings,
    port: process.env.PORT === undefined ? settings.port : Number(process.env.PORT),
    host: process.env.HOST ?? settings.host,
  };
  if (!Value.Check(ServerConfigSchema, config)) {
    throw new Error('Invalid server configuration (config/server.json, PORT or HOST).');
  }
  return config;
}
export type ServerConfig = ReturnType<typeof serverConfig>;
