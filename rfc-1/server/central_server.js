const WebSocket = require('ws');
const crypto = require('crypto');

const wss = new WebSocket.Server({ port: 8080 });

let blockchain = [];
let pendingTransactions = [];
const clients = new Set();
const miners = new Set();

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
}

function createGenesisBlock() {
  return new Block(0, "0", Date.now(), "Genesis block");
}

blockchain.push(createGenesisBlock());

function broadcastToAll(message) {
  const messageString = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
  miners.forEach(miner => {
    if (miner.readyState === WebSocket.OPEN) {
      miner.send(messageString);
    }
  });
  console.log(`[SERVER] Broadcasted: ${message.type}`);
}

wss.on('connection', (ws) => {
  console.log('[SERVER] New connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[SERVER] Received message: ${data.type}`);

      switch (data.type) {
        case 'REGISTER':
          if (data.role === 'client') {
            clients.add(ws);
            console.log('[SERVER] New client registered');
          } else if (data.role === 'miner') {
            miners.add(ws);
            console.log('[SERVER] New miner registered');
          }
          console.log(`[SERVER] Sending blockchain with ${blockchain.length} blocks`);
          ws.send(JSON.stringify({ 
            type: 'BLOCKCHAIN', 
            chain: blockchain.map(block => ({
              index: block.index,
              previousHash: block.previousHash,
              timestamp: block.timestamp,
              transactions: block.transactions,
              nonce: block.nonce,
              hash: block.hash
            }))
          }));
          break;

        case 'NEW_TRANSACTION':
          console.log(`[SERVER] New transaction received: ${JSON.stringify(data.transaction)}`);
          pendingTransactions.push(data.transaction);
          broadcastToAll({ type: 'PENDING_TRANSACTION', transaction: data.transaction });
          break;

        case 'MINED_BLOCK':
          console.log(`[SERVER] Received mined block: ${data.block.hash}`);
          const newBlock = new Block(
            data.block.index,
            data.block.previousHash,
            data.block.timestamp,
            data.block.transactions,
            data.block.nonce
          );
          console.log(`[SERVER] Validating block: ${newBlock.hash}`);
          console.log(`[SERVER] Block index: ${newBlock.index}, Previous hash: ${newBlock.previousHash}`);
          console.log(`[SERVER] Block timestamp: ${newBlock.timestamp}, Nonce: ${newBlock.nonce}`);
          console.log(`[SERVER] Number of transactions: ${newBlock.transactions.length}`);
          
          if (newBlock.hash.startsWith('0000') && newBlock.calculateHash() === data.block.hash) {
            if (newBlock.index === blockchain.length && newBlock.previousHash === blockchain[blockchain.length - 1].hash) {
              blockchain.push(newBlock);
              pendingTransactions = pendingTransactions.filter(tx => 
                !newBlock.transactions.some(minedTx => 
                  minedTx.fromAddress === tx.fromAddress && 
                  minedTx.toAddress === tx.toAddress && 
                  minedTx.amount === tx.amount
                )
              );
              console.log(`[SERVER] Valid block added to blockchain: ${newBlock.hash}`);
              broadcastToAll({ type: 'NEW_BLOCK', block: newBlock });
            } else {
              console.log(`[SERVER] Block index or previous hash mismatch. Discarding block.`);
            }
          } else {
            console.log('[SERVER] Invalid block hash. Discarding block.');
          }
          break;

        default:
          console.log(`[SERVER] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error(`[SERVER] Error processing message: ${error.message}`);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    miners.delete(ws);
    console.log('[SERVER] Connection closed');
  });
});

console.log('[SERVER] Central server started on ws://localhost:8080');