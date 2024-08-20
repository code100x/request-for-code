// centralServer.js
const WebSocket = require('ws');
const { calculateHash, isValidNewBlock } = require('../utils/utils.js');
const { UTXOPool } = require('../utxo/UTXOPool.js');

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.utxoPool = new UTXOPool();
    this.utxoPool.initializeFromBlockchain(this.chain);
  }

  createGenesisBlock() {
    return {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0',
      hash: calculateHash(JSON.stringify({
        index: 0,
        timestamp: Date.now(),
        transactions: [],
        previousHash: '0'
      }))
    };
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    const lBlock = this.getLatestBlock();
    console.log("Attempting to add block", newBlock);

    if (isValidNewBlock(newBlock, lBlock)) {
      this.chain.push(newBlock);
      this.updateUTXOPool(newBlock);
      console.log("Block successfully added to the blockchain.");
      return true;
    }
    console.error("Failed to add block: validation failed.");
    return false;
  }

  getChain() {
    return this.chain;
  }

  updateUTXOPool(block) {
    // Removing UTXOs inputs
    block.transactions.forEach(tx => {
      tx.inputs.forEach(input => {
        this.utxoPool.removeUTXO(input.txId, input.index);
      });
    });

    // Adding  UTXOs
    block.transactions.forEach(tx => {
      tx.outputs.forEach((output, index) => {
        this.utxoPool.addUTXO(tx.txId, index, output.amount, output.address);
      });
    });
  }
}

const blockchain = new Blockchain();
const wss = new WebSocket.Server({ port: 3001 });

const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  
  ws.send(JSON.stringify({ type: 'initialSync', data: blockchain.getChain() }));

  ws.on('message', message => {
    const { type, data } = JSON.parse(message);

    if (type === 'newBlock') {
    
      const newBlock = data;
      blockchain.addBlock(newBlock);
      broadcast({ type: 'newBlock', data: newBlock });
    } else if (type === 'newTransaction') {
      broadcast({ type: 'newTransaction', data });
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

console.log('Central server running on ws://localhost:3001');
