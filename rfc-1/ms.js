const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const centralServerUrl = 'ws://localhost:8080';
const ws = new WebSocket(centralServerUrl);

let blockchain = [];
let pendingTransactions = [];
let difficulty = 4; 
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true
}));

const createGenesisBlock = () => {
    return {
        index: 0,
        previousHash: '0',
        timestamp: Date.now(),
        transactions: [],
        hash: 'genesis-hash',
        nonce: 0
    };
};

const calculateHash = (block) => {
    return crypto.createHash('sha256').update(
        block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce
    ).digest('hex');
};

const proofOfWork = (block) => {
    let hash = calculateHash(block);
    while (!hash.startsWith('0'.repeat(difficulty))) {
        block.nonce++;
        hash = calculateHash(block);
    }
    return hash;
};

const createBlock = () => {
    const lastBlock = blockchain[blockchain.length - 1];
    const newBlock = {
        index: lastBlock.index + 1,
        previousHash: lastBlock.hash,
        timestamp: Date.now(),
        transactions: pendingTransactions,
        nonce: 0
    };

    newBlock.hash = proofOfWork(newBlock);
    return newBlock;
};

const addBlock = (block) => {
    const lastBlock = blockchain[blockchain.length - 1];
    if (block.previousHash === lastBlock.hash && block.index === lastBlock.index + 1) {
        blockchain.push(block);
        pendingTransactions = [];
        return true;
    }
    return false;
};

ws.on('open', () => {
    console.log('Connected to the central server');
    blockchain.push(createGenesisBlock());

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Received data:', data);

        if (data.type === 'BLOCK') {
            const isValid = addBlock(data.block);
            if (!isValid) {
                console.log('Rejected block');
            }
        } else if (data.type === 'TRANSACTION') {
            pendingTransactions.push(data.transaction);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        console.log('Disconnected from the central server');
    });

    setInterval(() => {
        if (pendingTransactions.length > 0) {
            const newBlock = createBlock();
            ws.send(JSON.stringify({ type: 'BLOCK', block: newBlock }));
        }
    }, 10000);
});

app.post('/transaction', (req, res) => {
    const transaction = req.body;
    pendingTransactions.push(transaction);
    console.log('Received transaction:', transaction);
    res.sendStatus(200);
});

app.listen(3001, () => {
    console.log('Transaction server running on http://localhost:3001');
});

console.log('Miner connected');