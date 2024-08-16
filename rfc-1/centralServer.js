const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let miners = [];

wss.on('connection', (ws) => {
    miners.push(ws);

    ws.on('message', (message) => {
        // Broadcast the message to all connected miners
        miners.forEach((miner) => {
            if (miner !== ws) {
                miner.send(message);
            }
        });
    });

    ws.on('close', () => {
        miners = miners.filter((miner) => miner !== ws);
    });
});

console.log('Central WebSocket Server running on ws://localhost:8080');
