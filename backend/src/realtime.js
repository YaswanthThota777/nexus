import { WebSocketServer } from 'ws';

let wss;

export function attachRealtime(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'system.ready', message: 'Realtime stream connected.' }));
  });
}

export function broadcast(event) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}
