const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 8080 });

let blockchain = [];  // Store blockchain in-memory
let miners = [];
let difficulty = 4;  // Initial difficulty: requires hash to start with '0000'
const targetBlockTime = 30000;  // Target block time: 30 seconds
const adjustmentInterval = 5;  // Adjust difficulty every 5 blocks
let balances = {};  // Ledger to track account balances
let miningInProgress = false;  // Flag to prevent multiple blocks being mined in the same interval

// Function to create key pairs and fund initial balances
async function initializeBlockchain() {
    const keypairs = [];
    const initialBalance = 10000000;
    const wallets = [];

    for (let i = 0; i < 4; i++) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        keypairs.push({ publicKey, privateKey });

        // Assign the initial balance to the wallet
        balances[publicKey] = initialBalance;

        wallets.push({ publicKey: publicKey, privateKey: privateKey, balance: initialBalance });
    }
    console.log('Wallets:', wallets);


    console.log('Balances:', balances);
    console.log("starting the file save");

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

    //check if the blockchain is empty
    if (blockchain.length === 0) {
        //intilizing the blockchain
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

                // Broadcast the new block to all miners
                miners.forEach(miner => {
                    if (miner !== ws) {
                        miner.send(JSON.stringify({ type: 'block', block: data.block, difficulty, balances }));
                    }
                });

                // Notify miners to stop mining
                miners.forEach(miner => {
                    miner.send(JSON.stringify({ type: 'block_finalized', blockIndex: data.block.index }));
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

    // Calculate the average block time for the last 'adjustmentInterval' blocks
    const totalBlockTime = blocksToConsider.reduce((total, block, index) => {
        if (index > 0) {
            return total + (block.timestamp - blocksToConsider[index - 1].timestamp);
        }
        return total;
    }, 0);

    const averageBlockTime = totalBlockTime / (blocksToConsider.length - 1);

    // Adjust difficulty based on the average block time
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
        const { sender, recipient, amount } = tx;

        // Deduct the amount from the sender's balance
        if (balances[sender] !== undefined) {
            balances[sender] -= amount;
        } else {
            balances[sender] = -amount;  // Allow negative balance (overdraft) for simplicity
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
    console.log('New mining round started');
    miners.forEach(miner => {
        miner.send(JSON.stringify({ type: 'start_mining', difficulty }));
    });
}, targetBlockTime);

console.log('Central server running on ws://localhost:8080');
