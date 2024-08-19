const WebSocket = require("ws");
const crypto = require("crypto");
const { CENTRAL_CONFIG } = require("./utils/constant");
const { isValidTransaction, isValidNewBlock } = require("./utils/utils");

const port = 8080;
const server = new WebSocket.Server({ port });

let blockchain = [];
let mempool = [];
const clients = new Set();
let utxoSet = new Map();
let transactionsMap = new Map();
let totalTransactions = 0;

function broadcastMessage(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
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
    inputs: [],
    outputs: [
      {
        address: address,
        amount: CENTRAL_CONFIG.INITIAL_BALANCE,
      },
    ],
    timestamp: Date.now(),
  };

  // Add this transaction to the mempool
  mempool.push(transaction);
  if (!transactionsMap.has(address)) {
    transactionsMap.set(address, []);
  }
  transactionsMap.set(address, [transaction]);
  totalTransactions++;
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
  updateUTXOSet(initialTx);
  broadcastMessage({
    type: "NEW_TRANSACTION",
    totalWallets: transactionsMap.size,
    totalTransactions: totalTransactions,
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

function removeTransactionsFromMempool(transactions) {
  const transactionIds = new Set(transactions.map((tx) => tx.id));
  mempool = mempool.filter((tx) => !transactionIds.has(tx.id));
}

function processNewTransaction(transaction) {
  if (isValidTransaction(transaction, utxoSet)) {
    console.log("Server - Transaction is valid");
    const transactionId = crypto.randomBytes(32).toString("hex");
    transaction.id = transactionId;

    if (!transaction.timestamp) transaction.timestamp = Date.now();
    updateUTXOSet(transaction);
    addToMempool(transaction);

    // Update balances for affected addresses
    const affectedAddresses = new Set([
      ...transaction.inputs.map((input) => input.address),
      ...transaction.outputs.map((output) => output.address),
    ]);

    affectedAddresses.forEach((address) => {
      if (!transactionsMap.has(address)) {
        transactionsMap.set(address, []);
      }
      transactionsMap.get(address).push(transaction);
    });

    totalTransactions++;
    affectedAddresses.forEach((address) => {
      broadcastBalanceUpdate(address);
    });

    // Broadcast the new transaction
    broadcastMessage({
      type: "NEW_TRANSACTION",
      totalWallets: transactionsMap.size,
      totalTransactions: totalTransactions,
      transaction: transaction,
    });

    return true;
  } else {
    console.log("Server - Transaction is invalid");
    return false;
  }
}

function processNewBlock(block, difficulty) {
  if (isValidNewBlock(block, blockchain[blockchain.length - 1])) {
    blockchain.push(block);
    updateUTXOSetForBlock(block);
    removeTransactionsFromMempool(block.transactions);

    // Update balances for affected addresses
    const affectedAddresses = new Set();
    block.transactions.forEach((tx) => {
      tx.inputs.forEach((input) => affectedAddresses.add(input.address));
      tx.outputs.forEach((output) => affectedAddresses.add(output.address));
    });
    affectedAddresses.forEach((address) => {
      broadcastBalanceUpdate(address);
    });

    broadcastMessage({
      type: "NEW_BLOCK",
      block: block,
      difficulty: difficulty,
    });
    return true;
  }
  return false;
}

function getUserTransactions(address, limit = 10, offset = 0) {
  const userTxs = transactionsMap.get(address) || [];
  return userTxs
    .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp, newest first
    .slice(offset, offset + limit);
}

function getUserTransactionCount(address) {
  return transactionsMap.get(address)?.length || 0;
}

function getGlobalTransactions(limit = 10, offset = 0) {
  const allTransactions = Array.from(transactionsMap.values())
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp);

  // Remove duplicates (transactions involving multiple addresses)
  const uniqueTransactions = Array.from(
    new Set(allTransactions.map((tx) => tx.id))
  ).map((id) => allTransactions.find((tx) => tx.id === id));

  return uniqueTransactions.slice(offset, offset + limit);
}

function broadcastBalanceUpdate(address) {
  const balance = getAddressBalance(address);
  broadcastMessage({
    type: "BALANCE_UPDATE",
    address: address,
    balance: balance,
  });
}

function updateUTXOSet(transaction) {
  // Remove spent outputs
  transaction.inputs.forEach((input) => {
    const utxoKey = `${input.txid}:${input.vout}`;
    utxoSet.delete(utxoKey);
  });

  // Add new unspent outputs
  transaction.outputs.forEach((output, index) => {
    const utxoKey = `${transaction.id}:${index}`;
    utxoSet.set(utxoKey, {
      txid: transaction.id,
      vout: index,
      address: output.address,
      amount: output.amount,
    });
  });

  console.log("Server - UTXO set updated");
}

function updateUTXOSetForBlock(block) {
  block.transactions.forEach(updateUTXOSet);
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
        if (processNewBlock(data.block, data.difficulty)) {
          console.log("Received valid block");
        } else {
          console.log("Received invalid block");
        }
        break;
      case "NEW_TRANSACTION":
        if (processNewTransaction(data.transaction)) {
          console.log("Received valid transaction");
        } else {
          console.log("Received invalid transaction");
        }
        break;
      case "GET_BLOCKCHAIN":
        ws.send(
          JSON.stringify({
            type: "BLOCKCHAIN",
            blockchain,
            totalWallets: new Set(transactionsMap.keys()).size,
          })
        );
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
      case "GET_USER_TRANSACTIONS":
        const userTxs = getUserTransactions(data.address);
        const userTxCount = getUserTransactionCount(data.address);
        ws.send(
          JSON.stringify({
            type: "USER_TRANSACTIONS",
            transactions: userTxs,
            total: userTxCount,
          })
        );
      case "GET_GLOBAL_TRANSACTIONS":
        const globalTxs = getGlobalTransactions();
        ws.send(
          JSON.stringify({
            type: "GLOBAL_TRANSACTIONS",
            transactions: globalTxs,
            total: totalTransactions,
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
