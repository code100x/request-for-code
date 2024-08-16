const WebSocket = require('ws');
const port = 8080;

const wss = new WebSocket.Server({ port });

console.log(`Central server running on port ${port}`);

const miners = new Set();
let blockchain = [];

wss.on('connection', (ws) => {
  console.log('New miner connected');
  miners.add(ws);

  ws.on('message', (message) => {
    console.log('Received message:', message);
    const data = JSON.parse(message);
    if (data.type === 'GET_BLOCKCHAIN') {
      ws.send(JSON.stringify({ type: 'BLOCKCHAIN', blockchain }));
    } else if (data.type === 'NEW_BLOCK') {
      blockchain.push(data.block);
      broadcast(message, ws);
    } else {
      broadcast(message, ws);
    }
  });

  ws.on('close', () => {
    console.log('Miner disconnected');
    miners.delete(ws);
  });
});

function broadcast(message, sender) {
  miners.forEach((miner) => {
    if (miner !== sender && miner.readyState === WebSocket.OPEN) {
      miner.send(message);
    }
  });
}