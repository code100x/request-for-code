// minerServer.js
const WebSocket = require('ws');
const crypto = require('crypto');

const ws = new WebSocket('ws://localhost:8080');

let blockchain = [];
let pendingTransactions = [];

const createBlock = () => {
  const previousBlock = blockchain[blockchain.length - 1];
  const previousHash = previousBlock ? previousBlock.hash : '0';
  const block = {
    index: blockchain.length + 1,
    timestamp: Date.now(),
    transactions: pendingTransactions,
    previousHash,
    nonce: 0,
  };

  block.hash = mineBlock(block);
  blockchain.push(block);
  pendingTransactions = [];
  return block;
};

const mineBlock = (block) => {
  let hash;
  do {
    block.nonce++;
    hash = crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');
  } while (!hash.startsWith('0000'));
  return hash;
};

const handleNewBlock = (newBlock) => {
  const lastBlock = blockchain[blockchain.length - 1];

  if (lastBlock && lastBlock.index >= newBlock.index) {
    console.log('Ignoring shorter blockchain');
    return;
  }

  blockchain.push(newBlock);
  console.log('Blockchain updated with new block:', newBlock);
};

ws.on('open', () => {
  console.log('Connected to central server');
});

ws.on('message', (message) => {
  const newBlock = JSON.parse(message);
  handleNewBlock(newBlock);
});

ws.on('close', () => {
  console.log('Disconnected from central server');
});

setInterval(() => {
  const newBlock = createBlock();
  ws.send(JSON.stringify(newBlock));
  console.log('New block created and broadcasted:', newBlock);
}, 10000);
