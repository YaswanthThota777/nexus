import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { attachRealtime } from './realtime.js';
import { startRunWorker, stopRunWorker } from './services/runWorker.js';

const app = createApp();
const server = http.createServer(app);

attachRealtime(server);
startRunWorker();

server.listen(config.port, () => {
  console.log(`Nexus API listening on http://localhost:${config.port}`);
});

process.on('SIGINT', () => {
  stopRunWorker();
  server.close(() => process.exit(0));
});
