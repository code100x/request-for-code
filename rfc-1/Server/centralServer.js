const WebSocket = require('ws');
const { Blockchain, Block } = require('./block');  

const blockchain = new Blockchain();

const wss = new WebSocket.Server({ port: 8080 });

let miners = [];

wss.on('connection', (ws) => {
    miners.push(ws);

    ws.on('message', (message) => {
        const newBlock = JSON.parse(message);
        if (blockchain.addBlock(newBlock)) 
            {
            console.log('New block added:', newBlock);
            miners.forEach(miner => miner !== ws && miner.send(message));
        } else 
        {
            console.log('Rejected block:', newBlock);
        }
    });

    ws.on('close', () => {
        miners = miners.filter(miner => miner !== ws);
    });
});

console.log('Central server running on ws://localhost:8080');