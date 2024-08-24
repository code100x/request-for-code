const WebSocket = require('ws');
const crypto = require('crypto');

class Block {
  constructor(index, previousHash, timestamp, transactions, nonce = 0) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto.createHash('sha256').update(
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce
    ).digest('hex');
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`[MINER] Block mined: ${this.hash}`);
  }
}

class Miner {
  constructor() {
    this.blockchain = [];
    this.pendingTransactions = [];
    this.difficulty = 4;
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.on('open', () => {
      console.log('[MINER] Connected to central server');
      this.ws.send(JSON.stringify({ type: 'REGISTER', role: 'miner' }));
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`[MINER] Received message: ${message.type}`);

        switch (message.type) {
          case 'BLOCKCHAIN':
            this.blockchain = message.chain.map(blockData => new Block(
              blockData.index,
              blockData.previousHash,
              blockData.timestamp,
              blockData.transactions,
              blockData.nonce
            ));
            console.log(`[MINER] Received blockchain with ${this.blockchain.length} blocks`);
            break;
          case 'PENDING_TRANSACTION':
            console.log(`[MINER] Received new pending transaction: ${JSON.stringify(message.transaction)}`);
            this.pendingTransactions.push(message.transaction);
            this.mineBlock();
            break;
          case 'NEW_BLOCK':
            console.log(`[MINER] Received new block from another miner: ${message.block.hash}`);
            this.blockchain.push(new Block(
              message.block.index,
              message.block.previousHash,
              message.block.timestamp,
              message.block.transactions,
              message.block.nonce
            ));
            this.pendingTransactions = this.pendingTransactions.filter(tx => 
              !message.block.transactions.some(minedTx => 
                minedTx.fromAddress === tx.fromAddress && 
                minedTx.toAddress === tx.toAddress && 
                minedTx.amount === tx.amount
              )
            );
            break;
        }
      } catch (error) {
        console.error(`[MINER] Error processing message: ${error.message}`);
      }
    });
  }

  mineBlock() {
    if (this.pendingTransactions.length === 0) {
      console.log('[MINER] No pending transactions to mine');
      return;
    }

    console.log('[MINER] Starting to mine a new block');
    const previousBlock = this.blockchain.length > 0 ? this.blockchain[this.blockchain.length - 1] : null;
    const newBlock = new Block(
      this.blockchain.length,
      previousBlock ? previousBlock.hash : "0",
      Date.now(),
      this.pendingTransactions
    );

    console.log(`[MINER] Mining block with ${this.pendingTransactions.length} transactions`);
    newBlock.mineBlock(this.difficulty);
    console.log(`[MINER] Block successfully mined: ${newBlock.hash}`);

    this.ws.send(JSON.stringify({
      type: 'MINED_BLOCK',
      block: newBlock
    }));
    console.log('[MINER] Sent mined block to central server');

    this.pendingTransactions = [];
  }
}

const miner = new Miner();
console.log('[MINER] Miner started');