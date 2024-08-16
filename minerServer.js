const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const net = require('net');

//exposing a REST API to interact with the miner

const app = express();
app.use(express.json());
let PORT = 3000;

//if 3000 already in use, try 3001 or 3002
function checkPortInUse(PORT, callback) {
    const server = net.createServer();
    server.once('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is in use, trying another port`);
            PORT++;
            checkPortInUse(PORT, callback);
        } else {
            callback(err);
        }
    });

    server.once('listening', function () {
        server.close();
        callback(null, PORT);
    });

    server.listen(PORT);
}

checkPortInUse(PORT, (err, availablePort) => {
    if (err) {
        console.error('Error checking port:', err);
    } else {
        PORT = availablePort;
        console.log("Launching server on port", PORT);
        launchServer();
    }
});

function launchServer() {
    // Expose sendTransaction via an Express API
    app.post('/sendTransaction', (req, res) => {
        const { sender, recipient, amount, privateKey } = req.body;

        if (!sender || !recipient || !amount || !privateKey) {
            return res.status(400).send('Missing required fields');
        }

        sendTransaction(sender, recipient, amount, privateKey);
        res.send('Transaction processed');
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    const ws = new WebSocket('ws://localhost:8080');

    let blockchain = [];  // Store blockchain in-memory
    let transactionPool = [];  // Local pool for unconfirmed transactions
    let difficulty;  // Difficulty will be updated by the central server
    let balances = {};  // Ledger to track account balances
    let canMine = false;  // Flag to control mining

    ws.on('open', () => {
        console.log('Connected to central server');
        // Request the current blockchain and balances from the central server
        ws.send(JSON.stringify({ type: 'request_blockchain' }));
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'block') {
            handleReceivedBlock(data.block);
            difficulty = data.difficulty;  // Update difficulty
            balances = data.balances;  // Update balances
        } else if (data.type === 'blockchain') {
            if (data.blockchain.length > blockchain.length) {
                blockchain = data.blockchain;
                difficulty = data.difficulty;  // Update difficulty
                balances = data.balances;  // Update balances
                console.log('Blockchain, difficulty, and balances updated');
            } else {
                console.log('Received blockchain is not longer, ignoring');
            }
        } else if (data.type === 'transaction') {
            console.log('Received transaction from central server, adding to pool');
            transactionPool.push(data.transaction);
        } else if (data.type === 'start_mining') {
            difficulty = data.difficulty;  // Update difficulty
            canMine = true;
            console.log('Received start mining signal');
            mineBlock();
        } else if (data.type === 'block_finalized') {
            canMine = false;
            console.log('Mining stopped as block was finalized');
        }
    });

    function handleReceivedBlock(newBlock) {
        const lastBlock = blockchain[blockchain.length - 1];

        if (lastBlock && lastBlock.hash === newBlock.previousHash) {
            blockchain.push(newBlock);
            updateLocalBalances(newBlock.transactions);
            console.log('New block added to the chain:', newBlock);
        } else if (lastBlock && newBlock.index === blockchain.length) {
            console.log('Fork detected. Comparing chains...');

            if (validateBlock(newBlock)) {
                blockchain.push(newBlock);
                updateLocalBalances(newBlock.transactions);
                console.log('Fork resolved: Added new block as it extends a longer chain.');
            } else {
                console.log('Fork rejected: New block does not lead to a longer chain.');
            }
        } else {
            console.log('Invalid block rejected');
        }
    }

    function validateTransaction(transaction) {
        const { sender, recipient, amount, signature } = transaction;

        const verifier = crypto.createVerify('SHA256');
        verifier.update(JSON.stringify({ sender, recipient, amount }));
        const isValid = verifier.verify(sender, signature, 'hex');

        // Check if sender has enough balance
        if (balances[sender] === undefined || balances[sender] < amount) {
            console.log('Transaction rejected due to insufficient balance');
            return false;
        }

        // Additional checks can be added here

        if (isValid) {
            console.log('Transaction is valid');
            return true;
        } else {
            console.log('Transaction is invalid');
            return false;
        }
    }

    function mineBlock() {
        if (!canMine || transactionPool.length === 0) {
            console.log('Cannot mine: Either mining is not allowed or no transactions to mine');
            return;
        }

        const previousBlock = blockchain[blockchain.length - 1];
        const previousHash = previousBlock ? previousBlock.hash : '';
        let nonce = 0;
        let hash;

        // Filter out any invalid transactions before mining
        const validTransactions = transactionPool.filter(validateTransaction);

        if (validTransactions.length === 0) {
            console.log('No valid transactions to mine');
            return;
        }

        // Simple proof-of-work algorithm with dynamic difficulty
        do {
            nonce++;
            hash = crypto.createHash('sha256')
                .update(previousHash + JSON.stringify(validTransactions) + nonce)
                .digest('hex');
        } while (hash.substring(0, difficulty) !== '0'.repeat(difficulty) && canMine);

        if (!canMine) {
            console.log('Mining was stopped');
            return;
        }

        const block = {
            index: blockchain.length,
            timestamp: Date.now(),
            transactions: validTransactions,  // Include only valid transactions in the block
            nonce,
            hash,
            previousHash,
        };

        ws.send(JSON.stringify({ type: 'block', block }));
        canMine = false;  // Stop further mining

        // Clear the transaction pool only of valid transactions that were included in the block
        transactionPool = transactionPool.filter(tx => !validTransactions.includes(tx));
        updateLocalBalances(validTransactions);
    }

    // Function to update local balances based on transactions in the received block
    function updateLocalBalances(transactions) {
        transactions.forEach(tx => {
            const { sender, recipient, amount } = tx;

            // Deduct the amount from the sender's balance
            if (balances[sender] !== undefined) {
                balances[sender] -= amount;
            }

            // Add the amount to the recipient's balance
            if (balances[recipient] !== undefined) {
                balances[recipient] += amount;
            } else {
                balances[recipient] = amount;
            }
        });

        console.log('Updated local balances:', balances);
    }

    // Function to handle receiving a new transaction
    function handleTransaction(transaction) {
        if (validateTransaction(transaction)) {
            transactionPool.push(transaction);
            console.log('Transaction added to local pool and broadcasting to central server');

            // Broadcast the valid transaction to the central server
            ws.send(JSON.stringify({ type: 'transaction', transaction }));
        } else {
            console.log('Invalid transaction rejected');
        }
    }

    // Function to create and send a new transaction
    function sendTransaction(sender, recipient, amount, privateKey) {
        if (balances[sender] === undefined || balances[sender] < amount) {
            console.log('Insufficient balance to send the transaction');
            return;
        }

        const transaction = {
            sender,
            recipient,
            amount,
            timestamp: Date.now()
        };

        // Sign the transaction with the sender's private key
        const sign = crypto.createSign('SHA256');
        sign.update(JSON.stringify({ sender, recipient, amount }));
        const signature = sign.sign(privateKey, 'hex');

        transaction.signature = signature;

        // Handle and broadcast the transaction
        handleTransaction(transaction);
    }

}