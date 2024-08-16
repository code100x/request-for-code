const WebSocket = require('ws');
const crypto = require('crypto');

const centralServerUrl = 'ws://localhost:8080';
const ws = new WebSocket(centralServerUrl);

let blockchain = [];
let pendingTransactions = [];
const difficulty = 2; // Adjust the difficulty for proof-of-work

// Function to create the genesis block
function createGenesisBlock() {
    return createBlock('0', []); // '0' is the previousHash for the genesis block
}

ws.on('open', () => {
    console.log('Connected to the central server');

    // Ensure the genesis block is created if the blockchain is empty
    if (blockchain.length === 0) {
        const genesisBlock = createGenesisBlock();
        blockchain.push(genesisBlock);
        console.log('Genesis block created:', genesisBlock);
    }

    // Catch up to the blockchain from other miners
    catchUpToBlockchain();
});

ws.on('message', (message) => {
    const block = JSON.parse(message);

    if (isValidBlock(block, blockchain[blockchain.length - 1])) {
        blockchain.push(block);
        pendingTransactions = []; // Clear pending transactions
        console.log('Block accepted:', block);
    } else {
        console.log('Rejected invalid block:', block);
    }
});

function catchUpToBlockchain() {
    // Request the latest blockchain (simplified)
    ws.send(JSON.stringify({ type: 'requestBlockchain' }));
}

function createBlock(previousHash, transactions) {
    const block = {
        index: blockchain.length,
        timestamp: Date.now(),
        transactions,
        previousHash,
        nonce: 0,
    };

    // Proof of Work
    while (!isValidProof(block, difficulty)) {
        block.nonce++;
    }

    block.hash = calculateHash(block);
    return block;
}

function isValidProof(block, difficulty) {
    const hash = calculateHash(block);
    return hash.startsWith('0'.repeat(difficulty));
}

function calculateHash(block) {
    return crypto.createHash('sha256').update(
        block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce
    ).digest('hex');
}

function isValidBlock(newBlock, previousBlock) {
    if (previousBlock && previousBlock.index + 1 !== newBlock.index) return false;
    if (previousBlock && previousBlock.hash !== newBlock.previousHash) return false;
    if (calculateHash(newBlock) !== newBlock.hash) return false;
    return true;
}

function addTransaction(transaction) {
    pendingTransactions.push(transaction);
}

function mineBlock() {
    if (pendingTransactions.length === 0) {
        console.log("No transactions to mine.");
        return;
    }

    if (blockchain.length === 0) {
        console.error("Blockchain is not initialized. No blocks available to mine.");
        return;
    }

    const previousBlock = blockchain[blockchain.length - 1];
    const newBlock = createBlock(previousBlock.hash, pendingTransactions);

    blockchain.push(newBlock);
    ws.send(JSON.stringify(newBlock));
    console.log("Block mined and broadcasted:", newBlock);
}

// Example: Add and mine a transaction
addTransaction({ from: 'address1', to: 'address2', amount: 10 });
mineBlock();
