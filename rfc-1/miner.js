const WebSocket = require('ws');
const crypto = require('crypto');

class Block {
  constructor(index, previousHash, timestamp, data, hash, nonce) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash;
    this.nonce = nonce;
  }
}

class Miner {
  constructor(serverUrl) {
    this.blockchain = [];
    this.mempool = [];
    this.ws = new WebSocket(serverUrl);
    this.setupWebSocket();
    this.balances = {}; 
  }

  setupWebSocket() {
    this.ws.on('open', () => {
      console.log('Connected to central server');
      this.catchUpBlockchain();
    });

    this.ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.type === 'NEW_BLOCK') {
        this.receiveBlock(data.block);
      } else if (data.type === 'NEW_TRANSACTION') {
        this.addToMempool(data.transaction);
      } else if (data.type === 'BLOCKCHAIN') {
        this.receiveBlockchain(data.blockchain);
      }
    });
  }

  catchUpBlockchain() {
    this.ws.send(JSON.stringify({ type: 'GET_BLOCKCHAIN' }));
  }

  receiveBlockchain(blockchain) {
    if (this.isValidChain(blockchain) && blockchain.length > this.blockchain.length) {
      console.log('Received and accepted new blockchain');
      this.blockchain = blockchain;
      this.updateBalances();
    } else {
      console.log('Received blockchain is invalid or not longer than current chain');
    }
  }

  receiveBlock(block) {
    if (this.isValidBlock(block, this.getLatestBlock())) {
      this.blockchain.push(block);
      this.updateBalances();
      console.log('Added new block to the chain');
    } else {
      console.log('Received invalid block, rejecting');
    }
  }

  addToMempool(transaction) {
    if (this.isValidTransaction(transaction)) {
      this.mempool.push(transaction);
      console.log('Added new transaction to mempool');
    } else {
      console.log('Received invalid transaction, rejecting');
    }
  }

  isValidChain(chain) {
    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];
      if (!this.isValidBlock(currentBlock, previousBlock)) {
        return false;
      }
    }
    return true;
  }

  isValidBlock(block, previousBlock) {
    if (!previousBlock) {
      return block.index === 0; 
    }
    return (
      block.index === previousBlock.index + 1 &&
      block.previousHash === previousBlock.hash &&
      this.calculateHash(block) === block.hash &&
      block.hash.startsWith('0000') 
    );
  }

  isValidTransaction(transaction) {
    return true;
  }

  updateBalances() {
    this.balances = {};
    for (const block of this.blockchain) {
      for (const tx of block.data) {
        this.balances[tx.from] = (this.balances[tx.from] || 0) - tx.amount;
        this.balances[tx.to] = (this.balances[tx.to] || 0) + tx.amount;
      }
    }
  }

  getLatestBlock() {
    return this.blockchain.length > 0 ? this.blockchain[this.blockchain.length - 1] : null;
  }

  generateBlock() {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock ? previousBlock.index + 1 : 0;
    const previousHash = previousBlock ? previousBlock.hash : "0";
    const timestamp = Date.now();
    const data = this.mempool.slice(0, 10); 
    let nonce = 0;
    let hash = '';

    do {
      nonce++;
      hash = this.calculateHash({ index, previousHash, timestamp, data, nonce });
    } while (!hash.startsWith('0000')); 

    const newBlock = new Block(index, previousHash, timestamp, data, hash, nonce);
    if (this.isValidBlock(newBlock, previousBlock)) {
      this.blockchain.push(newBlock);
      this.broadcastBlock(newBlock);
      this.mempool = this.mempool.slice(10); 
      this.updateBalances();
      console.log(`Generated new block with index ${index}`);
    } else {
      console.log('Generated invalid block, discarding');
    }
  }

  calculateHash(block) {
    return crypto
      .createHash('sha256')
      .update(block.index + block.previousHash + block.timestamp + JSON.stringify(block.data) + block.nonce)
      .digest('hex');
  }

  broadcastBlock(block) {
    this.ws.send(JSON.stringify({ type: 'NEW_BLOCK', block }));
  }

  start() {
    setInterval(() => this.generateBlock(), 10000); 
  }
}

const miner = new Miner('ws://localhost:8080');
miner.start();