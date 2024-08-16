// minerserver.js
const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const EC = require('elliptic').ec;
const net = require('net');

const app = express();
app.use(express.json());
let PORT = 3000;

const ec = new EC('secp256k1');

// If 3000 already in use, try 3001 or 3002
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
        const { recipient, amount, privateKey } = req.body;
        if (amount <= 0) {
            return res.status(400).send('Amount must be greater than 0');
        }
        //making sure recipient is a valid address
        if (recipient.length !== 40) {
            return res.status(400).send('Invalid recipient address');
        }
        if (privateKey.length !== 64) {
            return res.status(400).send('Invalid private key');
        }
        sendTransaction(recipient, amount, privateKey);
        res.send('Transaction processed');
    });

    // Expose getBalances via an Express API
    app.get('/getBalances', (req, res) => {
        res.send(balances);
    });

    //expose blockheight via an Express API
    app.get('/getBlockHeight', (req, res) => {
        res.send({ blockHeight: blockchain.length });
    });

    // expose getbalance of a specific address via an Express API
    app.get('/getBalance/:address', (req, res) => {
        const { address } = req.params;
        res.send({ balance: balances[address] || 0 });
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
            balances = data.balances;  // Sync balances after block is finalized
            console.log('Mining stopped as block was finalized and balances synced');
        } else if (data.type === 'balances') {
            balances = data.balances;
            console.log('Balances synced:', balances);
        }
    });

    function handleReceivedBlock(newBlock) {
        const lastBlock = blockchain[blockchain.length - 1];

        if (lastBlock && lastBlock.hash === newBlock.previousHash) {
            if (newBlock.index === blockchain.length) {
                console.log('Block already added locally, skipping duplicate processing');
                return;
            }

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


    function publicKeyToAddress(publicKey) {
        const sha256 = crypto.createHash('sha256').update(publicKey, 'hex').digest();
        const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
        return ripemd160;
    }

    function validateTransaction(transaction) {
        const { publicKey, recipient, amount, timestamp, signature } = transaction;

        const key = ec.keyFromPublic(publicKey, 'hex');
        const isValid = key.verify(crypto.createHash('sha256').update(publicKey + recipient + amount + timestamp).digest(), signature);

        // for managing balances this has nothing to do with signature verification
        const senderAddress = publicKeyToAddress(publicKey);

        // Check if sender has enough balance
        if (balances[senderAddress] === undefined || balances[senderAddress] < amount) {
            console.log('Transaction rejected due to insufficient balance');
            return false;
        }
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

        const validTransactions = transactionPool.filter(validateTransaction);

        if (validTransactions.length === 0) {
            console.log('No valid transactions to mine');
            return;
        }

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
            transactions: validTransactions,
            nonce,
            hash,
            previousHash,
        };

        console.log(`Block verified: ${JSON.stringify(block)}`);

        // Clear the transaction pool immediately after mining
        transactionPool = transactionPool.filter(tx => !validTransactions.includes(tx));

        // Directly update balances before sending the block
        updateLocalBalances(validTransactions);

        ws.send(JSON.stringify({ type: 'block', block }));
        console.log('Block sent to central server');
        canMine = false;
    }


    // Function to update local balances based on transactions in the received block
    function updateLocalBalances(transactions) {
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
    function sendTransaction(recipient, amount, privateKey) {
        // Derive the public key from the private key
        const key = ec.keyFromPrivate(privateKey, 'hex');
        const publicKey = key.getPublic().encode('hex');
        const senderAddress = publicKeyToAddress(publicKey);

        if (balances[senderAddress] === undefined || balances[senderAddress] < amount) {
            console.log('Insufficient balance to send the transaction');
            return;
        }


        const transaction = {
            publicKey,  // Use the public key as the sender
            recipient,
            amount,
            timestamp: Date.now()
        };

        const transactionData = publicKey + recipient + amount + transaction.timestamp;
        const signature = key.sign(crypto.createHash('sha256').update(transactionData).digest()).toDER('hex');

        transaction.signature = signature;

        // Handle and broadcast the transaction
        handleTransaction(transaction);
    }
}

