import { ONLINE_CONFIG } from '../src/online/config';
import { serverConfig } from './config';
import { createOnlineServer } from './create-server';
import { loadServerContent } from './load-content';

const config = serverConfig();
const { server } = await createOnlineServer(loadServerContent(), ONLINE_CONFIG, config);
await server.listen(config.port, config.host);
console.log(`Robattle server listening on ${config.host}:${config.port}`);
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    void server.gracefullyShutdown(false).catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
  });
}
