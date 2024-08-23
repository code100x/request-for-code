// centralServer.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let miners = [];

wss.on('connection', (ws) => {
  miners.push(ws);
  console.log('Miner connected');

  ws.on('message', (message) => {
    console.log('Received:', message);

    miners.forEach((miner) => {
      if (miner !== ws && miner.readyState === WebSocket.OPEN) {
        miner.send(message);
      }
    });
  });

  ws.on('close', () => {
    miners = miners.filter((miner) => miner !== ws);
    console.log('Miner disconnected');
  });
});

console.log('Central server running on ws://localhost:8080');
