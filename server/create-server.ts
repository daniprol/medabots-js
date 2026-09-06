import { createServer } from 'node:http';

import { LobbyRoom, Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';

import type { ContentCatalog } from '../src/content/catalog';
import type { OnlineConfig } from '../src/online/config';
import { contentHash } from '../src/online/content-identity';
import { BATTLE_ROOM, LOBBY_ROOM } from '../src/online/protocol';
import { battleRoomType } from './battle-room';
import type { ServerConfig } from './config';

export async function createOnlineServer(
  content: ContentCatalog,
  online: OnlineConfig,
  config: ServerConfig,
) {
  if (!Object.hasOwn(content.rules, online.defaultRulesId)) {
    throw new Error('Unknown configured online rules.');
  }
  const hash = await contentHash(content);
  const allowed = (origin: string | null) => !origin || config.allowedOrigins.includes(origin);
  matchMaker.controller.getCorsHeaders = (headers) => ({
    ...matchMaker.controller.DEFAULT_CORS_HEADERS,
    'Access-Control-Allow-Origin': allowed(headers.get('origin'))
      ? (headers.get('origin') ?? '*')
      : 'null',
    Vary: 'Origin',
  });
  const http = createServer();
  const transport = new WebSocketTransport({
    server: http,
    maxPayload: config.maxPayloadBytes,
    pingInterval: config.pingIntervalMs,
    pingMaxRetries: config.pingMaxRetries,
    beforeUpgrade: (_request, context) => {
      if (!allowed(context.headers.get('origin'))) {
        return new Response('Origin not allowed', { status: 403 });
      }
    },
  });
  const server = new Server({ transport, greet: false, gracefullyShutdown: false });
  server.define(BATTLE_ROOM, battleRoomType(content, online, hash)).enableRealtimeListing();
  server.define(LOBBY_ROOM, LobbyRoom);
  return { server, http, hash };
}
