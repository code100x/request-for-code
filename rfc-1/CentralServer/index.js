const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const nacl = require('tweetnacl');
const { PublicKey } = require('@solana/web3.js');
const crypto = require('crypto');
const axios = require('axios');
const Mempool = require('./model/mempool');
const Miner = require('./model/miner');
const Block = require("./model/block");
const cors = require('cors');


const app = express();
app.use(cors());
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

mongoose.connect('mongodb://localhost:27017/bitcoin_simulator');

app.use(express.json());

let connectedMiners = {};

function generateMinerId() {
    return crypto.randomBytes(16).toString('hex');
}

function generateHash(data) {
    return crypto.createHash('sha256').update(data).digest();
}

function verifySignature(message, signatureHex, pubKeyBase58) {
    const hash = generateHash(message);
    const signature = Buffer.from(signatureHex, 'hex');

    try {
        const publicKey = new PublicKey(pubKeyBase58);
        return nacl.sign.detached.verify(hash, signature, publicKey.toBuffer());
    } catch (err) {
        console.error('Error verifying signature:', err);
        return false;
    }
}

async function handleNewTransaction(transaction) {
    const { sender_pub_id, receiver_pub_id, amount, timestamp, signature } = transaction;
    const message = `${sender_pub_id}${receiver_pub_id}${amount}${timestamp}`;

    try {
        const isSignatureValid = verifySignature(message, signature, sender_pub_id);

        if (isSignatureValid) {
            await Mempool.create(transaction);
            distributeTransactionToMiner(transaction);
        } else {
            console.log('Invalid transaction detected.');
        }
    } catch (err) {
        console.error('Error handling new transaction:', err);
    }
}

async function distributeTransactionToMiner(transaction) {
    const minerIds = Object.keys(connectedMiners);

    if (minerIds.length > 0) {
        const minerIndex = Math.floor(Math.random() * minerIds.length);
        const minerId = minerIds[minerIndex];
        wss.clients.forEach((wsClient) => {
            if (wsClient.readyState === WebSocket.OPEN && wsClient.minerId === minerId) {
                wsClient.send(JSON.stringify({
                    type: 'NEW_TRANSACTION',
                    payload: transaction,
                }));
            }
        });

        console.log(`Transaction ${transaction.signature} sent to miner ${minerId}`);
    } else {
        console.log('No miners are currently connected.');
    }
}

async function updateMinerStatus(minerId, isConnected) {
    if (isConnected) {
        connectedMiners[minerId] = true;
    } else {
        delete connectedMiners[minerId];
    }

    await Miner.findOneAndUpdate(
        { minerId },
        { isConnected },
        { upsert: true, new: true }
    );
}

async function handleNewBlock(blockData) {
    try {
        const { previousHash, transactions, nonce, timestamp, hash } = blockData;
        const lastBlock = await Block.findOne().sort({ _id: -1 });
        if (lastBlock && lastBlock.hash !== previousHash) {
            console.log('Invalid block: Previous hash does not match');
            return;
        }

        // Verify each transaction in the block
        for (const tx of transactions) {
            const { sender_pub_id, receiver_pub_id, amount, timestamp, signature } = tx;
            const message = `${sender_pub_id}${receiver_pub_id}${amount}${timestamp}`;
            const isSignatureValid = verifySignature(message, signature, sender_pub_id);

            if (!isSignatureValid) {
                console.log(`Invalid transaction in block: ${signature}`);
                return;
            }

            // If valid, call /maketxn to complete the transaction
            await axios.post('http://localhost:3002/maketxn', {
                amount,
                sender_pub_id,
                receiver_pub_id,
                signature,
                timestamp,
            });
        }

        await Block.create(blockData);

        // Remove transactions from the mempool after they are added to a block
        for (const tx of transactions) {
            await Mempool.deleteOne({ signature: tx.signature });
        }

        console.log('New block added to the blockchain:', blockData);

        // Broadcast the new block to all connected clients
        wss.clients.forEach((wsClient) => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({
                    type: 'NEW_BLOCK_BROADCAST',
                    payload: blockData,
                }));
            }
        });
    } catch (err) {
        console.error('Error handling new block:', err);
    }
}

app.post('/api/submit-transaction', async (req, res) => {
    const { signature, sender_pub_id, receiver_pub_id, amount, timestamp } = req.body;

    if (!signature || !sender_pub_id || !receiver_pub_id || !amount || !timestamp) {
        return res.status(400).json({ msg: 'Missing required fields' });
    }

    const transaction = { signature, sender_pub_id, receiver_pub_id, amount, timestamp };
    try {
        await handleNewTransaction(transaction);
        res.status(200).json({ msg: 'Transaction received and added to mempool' });
    } catch (err) {
        res.status(500).json({ msg: 'Internal server error' });
    }
});

wss.on('connection', async (ws) => {
    const minerId = generateMinerId();
    ws.minerId = minerId;
    await updateMinerStatus(minerId, true);

    console.log(`Miner ${minerId} connected`);

    // Send the blockchain immediately after connection
    try {
        const blockchain = await Block.find().sort({ _id: 1 });
        ws.send(JSON.stringify({
            type: 'BLOCKCHAIN',
            payload: blockchain,
            version: '1.0.0',
        }));
        console.log(`Blockchain sent to miner ${minerId}`);
    } catch (err) {
        console.error('Error sending blockchain:', err);
    }

    ws.on('message', async (message) => {
        const parsedMessage = JSON.parse(message);
        const { type, payload } = parsedMessage;

        if (type === 'NEW_BLOCK') {
            await handleNewBlock(payload);
        }
    });

    ws.on('close', async () => {
        await updateMinerStatus(minerId, false);
    });
});

httpServer.listen(3001, () => {
    console.log('HTTP server running on http://localhost:3001');
    console.log('WebSocket server running on ws://localhost:3001');
});
