const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const apiRoutes = require('./route/apihandler');
const Mempool = require('./model/mempool');
const Miner = require('./model/miner');
const Block = require('./model/block');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

mongoose.connect('mongodb://localhost:27017/bitcoin_simulator');

app.use(express.json()); // to parse JSON request bodies
app.use('/api', apiRoutes);

let miners = []; 

function generateMinerId() {
    return `miner_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function updateMinerStatus(minerId, status) {
    try {
        const miner = await Miner.findOneAndUpdate(
            { minerId },
            { connected: status, lastSeen: new Date() },
            { upsert: true, new: true }
        );

        if (status) {
            miners.push(minerId); 
        } else {
            miners = miners.filter(id => id !== minerId); 
        }

        console.log(`Miner ${miner.minerId} is now ${status ? 'connected' : 'disconnected'}`);
    } catch (err) {
        console.error('Error updating miner status:', err);
    }
}

async function handleNewTransaction(transaction) {
    try {
        await Mempool.create(transaction);
        distributeTransactionToMiner(transaction);
    } catch (err) {
        console.error('Error handling new transaction:', err);
    }
}

function distributeTransactionToMiner(transaction) {
    if (miners.length > 0) {
        const minerIndex = Math.floor(Math.random() * miners.length);
        const minerId = miners[minerIndex];
        wss.clients.forEach((wsClient) => {
            if (wsClient.readyState === WebSocket.OPEN && wsClient.minerId === minerId) {
                wsClient.send(JSON.stringify({
                    type: 'NEW_TRANSACTION',
                    payload: transaction,
                }));
            }
        });

        console.log(`Transaction ${transaction.transactionId} sent to miner ${minerId}`);
    } else {
        console.log('No miners are currently connected.');
    }
}

async function handleNewBlock(message) {
    const parsedMessage = JSON.parse(message);
    const newBlock = new Block(parsedMessage.payload);

    try {
        await newBlock.save();
        const blockTransactions = parsedMessage.payload.transactions;
        await Mempool.deleteMany({ transactionId: { $in: blockTransactions.map(tx => tx.transactionId) } });

        // Send transactions to the wallet server to update balances
        for (const tx of blockTransactions) {
            await axios.post('http://localhost:3002/maketxn', {
                transaction_id: tx.transactionId,
                sender_pub_id: tx.sender_pub_id,
                receiver_pub_id: tx.receiver_pub_id,
                amount: tx.amount,
                timestamp: tx.timestamp
            });
        }

        // Notify all connected miners about the new block
        const clients = await Miner.find({ connected: true });
        clients.forEach((client) => {
            wss.clients.forEach((wsClient) => {
                if (wsClient.readyState === WebSocket.OPEN) {
                    wsClient.send(JSON.stringify(parsedMessage));
                }
            });
        });
    } catch (err) {
        console.error('Error handling new block:', err);
    }
}

// New API route for wallet to submit transactions
app.post('/api/submit-transaction', async (req, res) => {
    const { transaction_id, sender_pub_id, receiver_pub_id, amount, timestamp } = req.body;

    // console.log(req.body);

    if (!transaction_id || !sender_pub_id || !receiver_pub_id || !amount || !timestamp) {
        return res.status(400).json({ msg: 'Missing required fields' });
    }

    const transaction = {
        transactionId: transaction_id,
        sender_pub_id,
        receiver_pub_id,
        amount,
        timestamp
    };

    try {
        await handleNewTransaction(transaction);
        res.status(200).json({ msg: 'Transaction received and added to mempool' });
    } catch (err) {
        res.status(500).json({ msg: 'Internal server error' });
    }
});

wss.on('connection', (ws) => {
    const minerId = generateMinerId();
    ws.minerId = minerId; 
    updateMinerStatus(minerId, true);

    ws.on('message', async (message) => {
        const parsedMessage = JSON.parse(message);
        const { type, payload } = parsedMessage;

        if (type === 'NEW_TRANSACTION') {
            await handleNewTransaction(payload);
        } else if (type === 'NEW_BLOCK') {
            await handleNewBlock(message);
        } else if (type === 'SEND_CHAIN') {
            const blockchain = await Block.find().sort({ _id: 1 });
            ws.send(JSON.stringify({
                type: 'BLOCKCHAIN',
                payload: blockchain,
                version: '1.0.0',
            }));
        }
    });

    ws.on('close', () => {
        updateMinerStatus(minerId, false);
    });
});

httpServer.listen(3001, () => {
    console.log('HTTP server running on http://localhost:3001');
    console.log('WebSocket server running on ws://localhost:3001');
});
