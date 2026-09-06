import { ONLINE_CONFIG } from './config';

export type SavedServer = { name: string; url: string };
export const SERVER_STORAGE_KEY = 'robattle.online.servers.v1';

export function normalizeServerUrl(value: string, pageProtocol = 'http:'): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a full server URL, for example http://localhost:2567.');
  }
  if (
    !['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Use an HTTP(S) or WS(S) URL without credentials, query parameters or a fragment.',
    );
  }
  url.protocol =
    url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol;
  if (pageProtocol === 'https:' && url.protocol !== 'https:') {
    throw new Error(
      'This HTTPS game needs a secure HTTPS/WSS server. For local development, open the game over HTTP.',
    );
  }
  return url.href.replace(/\/$/, '');
}

export function readServers(storage: Pick<Storage, 'getItem'>): SavedServer[] {
  const builtIn = ONLINE_CONFIG.servers.map((server) => ({ ...server }));
  try {
    const saved: unknown = JSON.parse(storage.getItem(SERVER_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(saved)) {
      return builtIn;
    }
    for (const entry of saved.slice(0, 30)) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        !('name' in entry) ||
        !('url' in entry) ||
        typeof entry.name !== 'string' ||
        typeof entry.url !== 'string'
      ) {
        continue;
      }
      const url = normalizeServerUrl(entry.url);
      if (!builtIn.some((server) => server.url === url)) {
        builtIn.push({ name: entry.name.slice(0, 60), url });
      }
    }
  } catch {
    /* Unavailable or outdated browser storage still permits built-in servers. */
  }
  return builtIn;
}
