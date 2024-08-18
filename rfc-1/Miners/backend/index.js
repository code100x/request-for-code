const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

const httpServer = http.createServer(app);
const wss = new WebSocket('ws://localhost:3001');

let blockchain = [];
let mempool = [];
let minerStatus = 'waiting for transactions to complete the block';

function calculateNonce(block) {
    minerStatus = 'creating nonce';
    let nonce = 0;
    while (true) {
        block.nonce = nonce;
        const hash = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
        if (hash.startsWith('0000')) { 
            block.hash = hash;
            return block;
        }
        nonce++;
    }
}

wss.on('open', () => {
    console.log('Connected to the central server WebSocket');
    wss.send(JSON.stringify({ type: 'SEND_CHAIN' }));
});

wss.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    
    if (parsedMessage.type === 'BLOCKCHAIN') {
        blockchain = parsedMessage.payload;
        console.log('Received blockchain:', blockchain);
    } else if (parsedMessage.type === 'NEW_TRANSACTION') {
        mempool.push(parsedMessage.payload);
        console.log('Received new transaction:', parsedMessage.payload);

        if (mempool.length >= 3) {
            const block = {
                index: parseInt(blockchain[blockchain.length-1].index)+1,
                previousHash: blockchain[blockchain.length - 1].hash,
                transactions: mempool.splice(0, 3),
                timestamp: Date.now(),
                nonce: 0,
            };

            const minedBlock = calculateNonce(block);

            wss.send(JSON.stringify({
                type: 'NEW_BLOCK',
                payload: minedBlock,
            }));
            blockchain.push(minedBlock)
            
            console.log('New block created and sent to the central server:', minedBlock);

            minerStatus = 'waiting for transactions to complete the block';
        }
    } else if(parsedMessage.type==='NEW_BLOCK'){
        // ye jb koi other miner(s) block send kra hoga to central server broadcast krega
        blockchain.push(parsedMessage.payload);
    }
});

app.get('/status', (req, res) => {
    res.json({ status: minerStatus });
});

httpServer.listen(3003, () => {
    console.log('Miner API server running on http://localhost:3003');
});
