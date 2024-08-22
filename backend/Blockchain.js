import WebSocket from 'ws';
import crypto from 'crypto';
import proofOfWork from './utils.js';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);

// Define the Block class
class Block {
    constructor(index, previousHash, timestamp, transactions, hash, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = hash;
        this.nonce = nonce;
    }
}

// Define the Blockchain class
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.balances = {}; // In-memory balances
    }

    // Create the genesis block (first block in blockchain)
    createGenesisBlock() {
        const genesisBlock = new Block(0, '0', 0, [], '', 0);
        genesisBlock.hash = this.calculateHash(genesisBlock.index, genesisBlock.previousHash, genesisBlock.timestamp, genesisBlock.transactions, genesisBlock.nonce);
        proofOfWork(genesisBlock, this.difficulty);

        console.log('Genesis block created:', genesisBlock);

        return new Block(genesisBlock.index, genesisBlock.previousHash, genesisBlock.timestamp, genesisBlock.transactions, genesisBlock.hash, genesisBlock.nonce);
    }

    // Calculate the hash of the block
    calculateHash(index, previousHash, timestamp, transactions, nonce) {
        return crypto
            .createHash('sha256')
            .update(index + previousHash + timestamp + JSON.stringify(transactions) + nonce)
            .digest('hex');
    }

    // Create a new block with doing proof of work
    createBlock(transactions) {
        const previousBlock = this.chain[this.chain.length - 1];
        const index = previousBlock.index + 1;
        const timestamp = Date.now();
        const nonce = 0;

        const newBlock = new Block(index, previousBlock.hash, timestamp, transactions, '', nonce);
        proofOfWork(newBlock, this.difficulty);
        newBlock.hash = this.calculateHash(newBlock.index, newBlock.previousHash, newBlock.timestamp, newBlock.transactions, newBlock.nonce);

        return newBlock;
    }

    // Add a new block to the chain
    addBlock(newBlock) {
        if (this.isValidBlock(newBlock)) {
            this.chain.push(newBlock);
            this.pendingTransactions = []; // Clear pending transactions after adding a block
        } else {
            console.error('Invalid block:', newBlock);
        }
    }

    // Validate the block
    isValidBlock(newBlock) {
        const previousBlock = this.chain[this.chain.length - 1];

        if (!previousBlock) {
            console.error('Previous block is undefined');
            return false;
        }

        if (newBlock.index !== previousBlock.index + 1) {
            console.error('Invalid index:', newBlock.index);
            return false;
        }

        if (newBlock.previousHash !== previousBlock.hash) {
            console.error('Invalid previous hash:', newBlock.previousHash);
            console.log('Expected previous hash:', previousBlock.hash);
            return false;
        }

        const calculatedHash = this.calculateHash(newBlock.index, newBlock.previousHash, newBlock.timestamp, newBlock.transactions, newBlock.nonce);
        if (newBlock.hash !== calculatedHash) {
            console.error('Invalid hash:', newBlock.hash);
            console.log('Calculated hash:', calculatedHash);
            return false;
        }

        return true;
    }

    // Replace the chain with the new chain
    replaceChain(newChain) {
        console.log('Attempting to replace chain');
        console.log('Current chain length:', this.chain.length);
        console.log('New chain length:', newChain.length);

        const localLastBlock = this.chain[this.chain.length - 1];
        const newLastBlock = newChain[newChain.length - 1];

        if (newChain.length > this.chain.length || (newChain.length === this.chain.length && newLastBlock.hash !== localLastBlock.hash)) {
            if (this.isValidChain(newChain)) {
                console.log('New chain is valid. Replacing current chain.');
                this.chain = newChain;
                return true;
            } else {
                console.error('New chain is invalid.');
            }
        }

        return false;
    }

    // Validate the chain
    isValidChain(chain) {
        for (let i = 1; i < chain.length; i++) {
            const block = chain[i];
            const previousBlock = chain[i - 1];

            if (block.previousHash !== previousBlock.hash || block.hash !== this.calculateHash(block.index, block.previousHash, block.timestamp, block.transactions, block.nonce)) {
                console.error('Invalid block in chain:', block);
                return false;
            }
        }
        return true;
    }

    // Add a new transaction to the pending transactions
    addTransaction(transaction) {
        if (this.isValidTransaction(transaction)) {
            this.pendingTransactions.push(transaction);
        } else {
            console.error('Invalid transaction:', transaction);
        }
    }

    // Validate the transaction
    isValidTransaction(transaction) {
        const { from, to, amount, signature, publicKey } = transaction;

        // Check if all required fields are present
        if (!from || !to || !amount || !signature || !publicKey) {
            return false;
        }

        // Check if the sender has enough balance
        // if (!this.balances[from] || this.balances[from] < amount) {
        //     return false;
        // }

        try {
            const transactionString = JSON.stringify({ from, to, amount });
            const hash = bitcoin.crypto.sha256(Buffer.from(transactionString));

            const keyPair = ECPair.fromPublicKey(Buffer.from(publicKey, 'hex'));
            const isValid = keyPair.verify(hash, Buffer.from(signature, 'hex'));

            return isValid;
        } catch (error) {
            console.error('Error in transaction validation:', error);
            return false;
        }
    }

    // Mine the pending transactions
    mineBlock() {
        if (this.pendingTransactions.length === 0) {
            console.error('No pending transactions');
            return null;
        }

        const newBlock = this.createBlock(this.pendingTransactions);
        this.addBlock(newBlock);
        console.log('New block mined and added to the chain', newBlock);

        // Update balances
        this.pendingTransactions.forEach(transaction => {
            this.balances[transaction.from] -= transaction.amount;
            this.balances[transaction.to] = (this.balances[transaction.to] || 0) + transaction.amount;
        });

        return newBlock;
    }

    // Synchronize the chain with the central server
    syncChain(newChain) {
        if (this.replaceChain(newChain)) {
            console.log('Local blockchain has been updated with the latest chain from the network')
        } else {
            console.error('Failed to update local blockchain with the latest chain from the network')
        }
    }

    // Handle synchronization response
    handleSyncResponse(newChain) {
        if (newChain && Array.isArray(newChain)) {
            this.syncChain(newChain);
        } else {
            console.error('Invalid chain data received:', newChain);
        }
    }

    // Add new block to the chain
    async handleNewBlock(newBlock, wss) {
        try {
            if (newBlock.previousHash === this.chain[this.chain.length - 1].hash) {
                await this.addBlock(newBlock);
            } else {
                console.error('Previous hash mismatch. Requesting full blockchain sync.');
                // Request full blockchain sync from the central server
                wss.send(JSON.stringify({ type: 'SYNC_REQUEST' }));
            }
        } catch (error) {
            console.error('Error handling new block:', error);
            // Implement retry logic if needed
        }
    }

    // Add new transaction to the pending transactions
    handleNewTransaction(transaction, wss) {

        if (this.isValidTransaction(transaction)) {
            this.addTransaction(transaction);

            const newBlock = this.mineBlock();
            if (newBlock) {
                if (wss && wss.readyState === WebSocket.OPEN) {
                    wss.send(JSON.stringify({ type: 'NEW_BLOCK', block: newBlock }));
                } else {
                    console.error('WebSocket is not open or undefined');
                }
            }
        } else {
            console.error('Invalid transaction received:', transaction);
        }
    }

    // Print the blockchain
    printBlockchain() {
        console.log('Latest Blockchain:');
        this.chain.forEach(block => {
            console.log(`Index: ${block.index},\n Hash: ${block.hash},\n Previous Hash: ${block.previousHash},\n Timestamp: ${block.timestamp},\n Transactions: ${JSON.stringify(block.transactions)},\n Nonce: ${block.nonce}`);
        });
    }


    // Get blockchain
    getBlockchain() {
        return this.chain;
    }
}

export default Blockchain;
