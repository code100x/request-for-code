const WebSocket = require("ws");
const crypto = require("crypto");
const { CENTRAL_CONFIG } = require("./utils/constant");
const { isValidTransaction, isValidNewBlock } = require("./utils/utils");

const port = 8080;
const server = new WebSocket.Server({ port });

let blockchain = [];
const mempool = [];
const clients = new Set();
let utxoSet = new Map();

function broadcastMessage(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function updateUTXOSet(block) {
  // Remove spent outputs
  block.transactions.forEach((tx, txIndex) => {
    if (txIndex > 0) {
      // Skip coinbase transaction
      tx.inputs.forEach((input) => {
        const utxoKey = `${input.txid}:${input.vout}`;
        utxoSet.delete(utxoKey);
      });
    }
  });

  // Add new unspent outputs
  block.transactions.forEach((tx) => {
    tx.outputs.forEach((output, index) => {
      const utxoKey = `${tx.id}:${index}`;
      utxoSet.set(utxoKey, {
        txid: tx.id,
        vout: index,
        address: output.address,
        amount: output.amount,
      });
    });
  });
}

function getAddressBalance(address) {
  let balance = 0;
  for (const [_, utxo] of utxoSet) {
    if (utxo.address === address) {
      balance += utxo.amount;
    }
  }
  return balance;
}

function getAddressUTXOs(address) {
  return Array.from(utxoSet.entries())
    .filter(([_, utxo]) => utxo.address === address)
    .map(([key, utxo]) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      amount: utxo.amount,
      address: utxo.address,
    }));
}

function createInitialTransaction(address) {
  const transaction = {
    id: crypto.randomBytes(32).toString("hex"),
    inputs: [], // No inputs for initial transaction
    outputs: [
      {
        address: address,
        amount: CENTRAL_CONFIG.INITIAL_BALANCE,
      },
    ],
  };

  // Add this transaction to the mempool
  mempool.push(transaction);

  // Update UTXO set
  const utxoKey = `${transaction.id}:0`;
  utxoSet.set(utxoKey, {
    txid: transaction.id,
    vout: 0,
    address: address,
    amount: CENTRAL_CONFIG.INITIAL_BALANCE,
  });

  return transaction;
}

function fundWallet(address) {
  console.log("Funding wallet with address", address);
  const initialTx = createInitialTransaction(address);
  mempool.push(initialTx);
  updateUTXOSet({
    transactions: [initialTx],
  });
  broadcastMessage({
    type: "NEW_TRANSACTION",
    transaction: initialTx,
  });
}

function addToMempool(transaction) {
  if (mempool.length >= CENTRAL_CONFIG.MAX_MEMPOOL_SIZE) {
    // Remove oldest transaction if mempool is full
    mempool.shift();
  }
  mempool.push(transaction);
}

server.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (message) => {
    if (message.length > CENTRAL_CONFIG.MAX_MESSAGE_SIZE) {
      console.log("Received message exceeds size limit");
      return;
    }

    let data;
    try {
      data = JSON.parse(message);
    } catch (error) {
      console.log("Invalid JSON received:", error);
      return;
    }

    switch (data.type) {
      case "NEW_BLOCK":
        if (isValidNewBlock(data.block, blockchain[blockchain.length - 1])) {
          blockchain.push(data.block);
          updateUTXOSet(data.block);
          broadcastMessage({ type: "NEW_BLOCK", block: data.block });
        }
        break;
      case "NEW_TRANSACTION":
        if (isValidTransaction(data.transaction, utxoSet)) {
          const transactionId = crypto.randomBytes(32).toString("hex");
          data.transaction.id = transactionId;
          addToMempool(data.transaction);
          broadcastMessage({
            type: "NEW_TRANSACTION",
            transaction: data.transaction,
          });
        }
        break;
      case "GET_BLOCKCHAIN":
        ws.send(JSON.stringify({ type: "BLOCKCHAIN", blockchain }));
        break;
      case "GET_UTXO_SET":
        const utxos = getAddressUTXOs(data.address);
        if (utxos.length === 0 && data?.address) {
          fundWallet(data.address);
        }
        ws.send(JSON.stringify({ type: "UTXO_SET", utxoSet: utxos }));
        break;

      case "GET_BALANCE":
        const balance = getAddressBalance(data.address);
        ws.send(JSON.stringify({ type: "BALANCE", balance }));
        break;
      case "CREATE_WALLET":
        fundWallet(data.address);
        ws.send(
          JSON.stringify({
            type: "WALLET_CREATED",
            address: data.address,
            balance: CENTRAL_CONFIG.INITIAL_BALANCE,
          })
        );
        break;
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// Initialize blockchain with genesis block
const genesisBlock = {
  index: 0,
  hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
  previousHash:
    "0000000000000000000000000000000000000000000000000000000000000000",
  timestamp: Date.now(),
  transactions: [],
  nonce: 0,
};
blockchain.push(genesisBlock);

console.log(`WebSocket server is running on port ${port}`);
