const crypto = require('crypto');

class Block
 {

    constructor(index, previousHash, timestamp, transactions, nonce, hash) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.nonce = nonce;
        this.hash = hash;
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        return new Block(0, "0", Date.now(), [], 0, this.calculateHash(0, "0", Date.now(), [], 0));
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    calculateHash(index, previousHash, timestamp, transactions, nonce) {
        return crypto.createHash('sha256').update(index + previousHash + timestamp + JSON.stringify(transactions) + nonce).digest('hex');
    }

    addBlock(newBlock) {
        if (newBlock.previousHash === this.getLatestBlock().hash) {
            this.chain.push(newBlock);
            return true;
        }
        return false;
    }

    isChainValid(chain) {
        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];
            if (currentBlock.hash !== this.calculateHash(currentBlock.index, currentBlock.previousHash, currentBlock.timestamp, currentBlock.transactions, currentBlock.nonce) || 
                currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

module.exports = { Blockchain, Block };
