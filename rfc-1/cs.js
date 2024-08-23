const WebSocket = require('ws');
const crypto = require('crypto');
const wss = new WebSocket.Server({ port: 8080 });

let blockchain = [];
let miners = [];
let difficulty = 4;
const balanceMap = {};
const difficultyAdjustmentInterval = 10;
const targetBlockTime = 10000; // in milliseconds
let lastBlockTime = Date.now();

function calculateHash(block) {
    const blockData = block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce;
    return crypto.createHash('sha256').update(blockData).digest('hex');
}

const verifyBlock = (block) => {
    const lastBlock = blockchain[blockchain.length - 1]; 

    console.log('Last block:', lastBlock);
    console.log('Current block:', block);

    if (block.previousHash !== lastBlock.hash) {
        console.log('Invalid previousHash:', block.previousHash, 'Expected:', lastBlock.hash);
        return false;
    }

    const recalculatedHash = calculateHash(block);
    console.log('Recalculated hash:', recalculatedHash, 'Block hash:', block.hash);

    if (recalculatedHash !== block.hash) {
        console.log('Invalid hash:', block.hash, 'Expected:', recalculatedHash);
        return false;
    }

    if (!block.hash.startsWith('0'.repeat(difficulty))) {
        console.log('Invalid difficulty for hash:', block.hash);
        return false;
    }

    for (let txn of block.transactions) {
        if (!verifyTransaction(txn)) {
            console.log('Invalid transaction in block:', txn);
            return false;
        }
    }

    return true;
};

const verifyTransaction = (transaction) => {
    if (!verifySignature(transaction)) {
        console.log('Invalid transaction signature.');
        return false;
    }

    const senderBalance = getBalance(transaction.sender);
    if (senderBalance < transaction.amount) {
        console.log('Insufficient balance for transaction:', transaction);
        return false;
    }

    return true;
};

const verifySignature = (transaction) => {
    const { sender, amount, recipient, signature, publicKey } = transaction;
    const message = `${sender}${amount}${recipient}`;

    if (!publicKey) {
        console.log('Public key missing in transaction.');
        return false;
    }

    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        verify.end();

        return verify.verify(publicKey, signature, 'hex');
    } catch (error) {
        console.error('Errosignature verification:', error);
        return false;
    }
};

const adjustDifficulty = () => {
    if (blockchain.length % difficultyAdjustmentInterval === 0) {
        const now = Date.now();
        const timeTaken = now - lastBlockTime;

        if (timeTaken < targetBlockTime / 2) {
            difficulty++;
        } else if (timeTaken > targetBlockTime * 2) {
            difficulty--;
        }

        lastBlockTime = now;
    }
};

const getBalance = (address) => {
    return balanceMap[address] || 0;
};

const broadcast = (message) => {
    miners.forEach(miner => {
        if (miner.readyState === WebSocket.OPEN) {
            miner.send(message);
        }
    });
};

wss.on('connection', (ws) => {
    console.log('Miner connected');
    miners.push(ws);

    // Send the latest block to the miner
    if (blockchain.length > 0) {
        const latestBlock = blockchain[blockchain.length - 1];
        ws.send(JSON.stringify({ type: 'LATEST_BLOCK', block: latestBlock }));
    }

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message.toString('utf8'));
        console.log('Received:', parsedMessage);

        if (parsedMessage.type === 'BLOCK') {
            const isValid = verifyBlock(parsedMessage.block);
            if (isValid) {
                console.log('Block is valid and added to the chain');
                blockchain.push(parsedMessage.block);
                lastBlockTime = Date.now();
                adjustDifficulty(); // Adjust difficulty based on the new block
                broadcast(message);
            } else {
                console.log('Invalid block. Rejected.');
                ws.send(JSON.stringify({ type: 'BLOCK_REJECTED', reason: 'Invalid previousHash or hash' }));
            }
        } else if (parsedMessage.type === 'TRANSACTION') {
            console.log('Received transaction:', parsedMessage.transaction);
            if (verifyTransaction(parsedMessage.transaction)) {
                console.log('Transaction is valid');
                broadcast(message);
            } else {
                console.log('Invalid transaction. Rejected.');
                ws.send(JSON.stringify({ type: 'TRANSACTION_REJECTED', reason: 'Invalid transaction' }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Miner disconnected');
        miners = miners.filter(miner => miner !== ws);
    });
});

function createGenesisBlock() {
    return {
        index: 0,
        previousHash: '0',
        timestamp: Date.now(),
        transactions: [],
        nonce: 0,
        hash: calculateHash({
            index: 0,
            previousHash: '0',
            timestamp: Date.now(),
            transactions: [],
            nonce: 0
        })
    };
}


blockchain.push(createGenesisBlock());

console.log('Central server running on ws://localhost:8080');
