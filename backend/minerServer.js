import WebSocket from 'ws';
import Blockchain from './Blockchain.js';

const blockchain = new Blockchain();
let wss;
let isSynchronized = false;

function connectToServer() {
    wss = new WebSocket('ws://localhost:8080');

    wss.on('open', () => {
        console.log("Connected to central server");
        wss.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
    });

    wss.on('message', handleMessage);

    wss.on('error', handleError);

    wss.on('close', handleClose);
}

function handleMessage(message) {
    try {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'SYNC_RESPONSE':
                blockchain.handleSyncResponse(data.chain);
                isSynchronized = true;
                console.log('Blockchain synchronized');
                blockchain.printBlockchain();
                break;
            case 'NEW_BLOCK':
                blockchain.handleNewBlock(data.block, wss);
                console.log('New block received and added');
                break;
            case 'NEW_TRANSACTION':
                blockchain.handleNewTransaction(data.transaction, wss);
                console.log('New transaction received and added');
                break;
            case 'SYNC_REQUEST':
                // Handle SYNC_REQUEST by sending a SYNC_RESPONSE
                wss.send(JSON.stringify({ type: 'SYNC_REQUEST', chain: blockchain.getBlockchain() }));
                break;    
            default:
                console.error('Unknown message type in miner server:', data.type);
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
}

function handleError(error) {
    console.error('WebSocket error:', error);
}

function handleClose() {
    console.log('WebSocket connection closed');
}

function broadcastTransaction(transaction) {
    if (wss && wss.readyState === WebSocket.OPEN) {
        if (blockchain.isValidTransaction(transaction)) {
            blockchain.addTransaction(transaction);
            wss.send(JSON.stringify({ type: 'NEW_TRANSACTION', transaction }));
            console.log('New transaction broadcasted to the network');
        } else {
            console.error('Invalid transaction:', transaction);
        }
    } else {
        console.error('WebSocket not connected');
    }
}

connectToServer();