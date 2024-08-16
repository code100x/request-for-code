// centralServer.js

const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const EC = require('elliptic').ec;

const ec = new EC('secp256k1');
const wss = new WebSocket.Server({ port: 8080 });

let blockchain = [];  // Store blockchain in-memory
let miners = [];
let difficulty = 4;  // Initial difficulty: requires hash to start with '0000'
const targetBlockTime = 30000;  // Target block time: 30 seconds
const adjustmentInterval = 5;  // Adjust difficulty every 5 blocks
let balances = {};  // Ledger to track account balances
let miningInProgress = false;  // Flag to prevent multiple blocks being mined in the same interval

// Function to create a wallet with public key, private key, and address
function createWallet() {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    const address = publicKeyToAddress(publicKey);

    return { publicKey, privateKey, address };
}

// Function to derive address from public key
function publicKeyToAddress(publicKey) {
    const sha256 = crypto.createHash('sha256').update(publicKey, 'hex').digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
    return ripemd160;
}

// Function to create key pairs and fund initial balances
async function initializeBlockchain() {
    const wallets = [];
    const initialBalance = 10000000;

    for (let i = 0; i < 4; i++) {
        const wallet = createWallet();

        // Assign the initial balance to the wallet
        balances[wallet.address] = initialBalance;

        wallets.push({ publicKey: wallet.publicKey, privateKey: wallet.privateKey, address: wallet.address, balance: initialBalance });
    }

    console.log('Balances:', balances);
    console.log("Starting the file save");

    // Save the wallet information to a file
    fs.writeFileSync('fund-wallets.txt', JSON.stringify(wallets, null, 2));

    const genesisBlock = {
        index: 0,
        previousHash: '0'.repeat(64),
        timestamp: Date.now(),
        transactions: [],
        nonce: 0
    };

    blockchain.push(genesisBlock);
}

wss.on('connection', (ws) => {
    miners.push(ws);
    console.log('New miner connected');

    // Check if the blockchain is empty
    if (blockchain.length === 0) {
        // Initializing the blockchain
        initializeBlockchain();
        console.log('Blockchain initialized');
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'request_blockchain') {
            ws.send(JSON.stringify({ type: 'blockchain', blockchain, difficulty, balances }));
        } else if (data.type === 'block') {
            if (!miningInProgress && validateAndAddBlock(data.block)) {
                miningInProgress = true;
                console.log('Block mined and accepted, stopping mining');

                // Broadcast the new block and updated balances to all miners
                miners.forEach(miner => {
                    if (miner !== ws) {
                        miner.send(JSON.stringify({ type: 'block', block: data.block, difficulty, balances }));
                    }
                });

                // Notify miners to stop mining
                miners.forEach(miner => {
                    miner.send(JSON.stringify({ type: 'block_finalized', blockIndex: data.block.index, balances }));
                });

                // Adjust difficulty if necessary
                if (blockchain.length % adjustmentInterval === 0) {
                    adjustDifficulty();
                }
            } else {
                console.log('Block rejected due to mining already in progress or validation failure');
            }
        } else if (data.type === 'transaction') {
            // Broadcast the transaction to all miners
            miners.forEach(miner => {
                if (miner !== ws) {
                    miner.send(JSON.stringify({ type: 'transaction', transaction: data.transaction }));
                }
            });
            console.log('Transaction broadcasted to all miners');
        } else if (data.type === 'request_balances') {
            ws.send(JSON.stringify({ type: 'balances', balances }));
        }
    });

    ws.on('close', () => {
        miners = miners.filter(miner => miner !== ws);
        console.log('Miner disconnected');
    });
});

// Function to validate and add a block to the blockchain
function validateAndAddBlock(newBlock) {
    const lastBlock = blockchain[blockchain.length - 1];

    if (lastBlock && lastBlock.hash === newBlock.previousHash && validateBlock(newBlock)) {
        blockchain.push(newBlock);
        updateBalances(newBlock.transactions);
        return true;
    } else if (!lastBlock && newBlock.index === 0) {
        // Genesis block: the first block in the chain
        blockchain.push(newBlock);
        updateBalances(newBlock.transactions);
        return true;
    }
    return false;
}

// Function to validate a block based on current difficulty
function validateBlock(block) {
    const hash = crypto.createHash('sha256')
        .update(block.previousHash + JSON.stringify(block.transactions) + block.nonce)
        .digest('hex');
    return hash.substring(0, difficulty) === '0'.repeat(difficulty);
}

// Function to adjust the difficulty
function adjustDifficulty() {
    const lastBlock = blockchain[blockchain.length - 1];
    const blocksToConsider = blockchain.slice(-adjustmentInterval);

    const totalBlockTime = blocksToConsider.reduce((total, block, index) => {
        if (index > 0) {
            return total + (block.timestamp - blocksToConsider[index - 1].timestamp);
        }
        return total;
    }, 0);

    const averageBlockTime = totalBlockTime / (blocksToConsider.length - 1);

    if (averageBlockTime < targetBlockTime) {
        difficulty++;
        console.log('Difficulty increased to:', difficulty);
    } else if (averageBlockTime > targetBlockTime && difficulty > 1) {
        difficulty--;
        console.log('Difficulty decreased to:', difficulty);
    }
}

// Function to update balances based on the transactions in a new block
function updateBalances(transactions) {
    transactions.forEach(tx => {
        const { publicKey, recipient, amount } = tx;

        const sender = publicKeyToAddress(publicKey);
        console.log("Sender:", sender);
        if (sender === undefined) {
            console.log('Invalid sender address');
            return;
        }
        // Deduct the amount from the sender's balance
        if (balances[sender] !== undefined) {
            balances[sender] -= amount;
        } else {
            balances[sender] = -amount;
        }

        // Add the amount to the recipient's balance
        if (balances[recipient] !== undefined) {
            balances[recipient] += amount;
        } else {
            balances[recipient] = amount;
        }
    });

    console.log('Updated balances:', balances);
}

// Start mining process at regular intervals
setInterval(() => {
    miningInProgress = false;
    console.log('New mining Epoch started');
    miners.forEach(miner => {
        miner.send(JSON.stringify({ type: 'start_mining', difficulty }));
    });
}, targetBlockTime);

console.log('Central server running on ws://localhost:8080');