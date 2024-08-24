// centralServer.js
const express = require("express");
const WebSocket = require("ws");
const fs = require("fs");
const {
  generateBlockHash,
  publicKeyToAddress,
  validateBlock,
} = require("./blockchainUtils");
const EC = require("elliptic").ec;
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const ec = new EC("secp256k1");
const wss = new WebSocket.Server({ port: 8080 });
const Central_RPC_PORT = 8081;

let blockchain = []; // Store blockchain in-memory
let miners = [];
let difficulty = 4; // Initial difficulty: requires hash to start with '0000'
const adjustmentInterval = 5; // Adjust difficulty every 5 blocks
let balances = {}; // Ledger to track account balances
const desiredBlockTime = 30000; // 30 seconds
let transactionPool = []; // Central server's transaction pool

function createWallet() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic("hex");
  const address = publicKeyToAddress(publicKey);

  return { publicKey, privateKey, address };
}

async function initializeBlockchain() {
  const wallets = [];
  const initialBalance = 10000000;

  for (let i = 0; i < 4; i++) {
    const wallet = createWallet();
    balances[wallet.address] = initialBalance;

    wallets.push({
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      address: wallet.address,
      balance: initialBalance,
    });
  }

  console.log("Balances:", balances);

  fs.writeFileSync("fund-wallets.txt", JSON.stringify(wallets, null, 2));

  const genesisTimestamp = Date.now();
  const genesisBlock = {
    index: 0,
    previousHash: "0".repeat(64),
    timestamp: genesisTimestamp,
    transactions: [],
    nonce: 0,
    hash: generateBlockHash({
      index: 0,
      previousHash: "0".repeat(64),
      timestamp: genesisTimestamp,
      transactions: [],
      nonce: 0,
    }),
  };

  blockchain.push(genesisBlock);
}

wss.on("connection", (ws) => {
  miners.push(ws);
  console.log("New miner connected");

  if (blockchain.length === 0) {
    initializeBlockchain();
    console.log("Blockchain initialized");
  }

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "request_blockchain") {
      ws.send(
        JSON.stringify({ type: "blockchain", blockchain, difficulty, balances })
      );
    } else if (data.type === "block") {
      if (validateAndAddBlock(data.block)) {
        console.log("Block mined and accepted, broadcasting to other miners");

        // Notify the miner that its block was accepted
        ws.send(JSON.stringify({ type: "block_accepted", block: data.block }));

        // Broadcast the accepted block to all other miners
        miners.forEach((miner) => {
          miner.send(
            JSON.stringify({
              type: "block",
              block: data.block,
              difficulty,
              balances,
            })
          );
        });

        if (blockchain.length % adjustmentInterval === 0) {
          adjustDifficulty();
        }
      } else {
        console.log("Block rejected due to validation failure");

        // Notify the miner that its block was rejected
        ws.send(JSON.stringify({ type: "block_rejected", block: data.block }));
      }
    } else if (data.type === "transaction") {
      miners.forEach((miner) => {
        if (miner !== ws) {
          miner.send(
            JSON.stringify({
              type: "transaction",
              transaction: data.transaction,
            })
          );
        }
      });
      console.log("Transaction broadcasted to all miners");
    }
  });

  ws.on("close", () => {
    miners = miners.filter((miner) => miner !== ws);
    console.log("Miner disconnected");
  });
});

function validateAndAddBlock(newBlock) {
  const lastBlock = blockchain[blockchain.length - 1];
  console.log("Validating new block:", newBlock);

  if (lastBlock) {
    console.log("Last block:", lastBlock);
  }

  if (
    lastBlock &&
    lastBlock.hash === newBlock.previousHash &&
    newBlock.index === lastBlock.index + 1 &&
    validateBlock(newBlock, difficulty)
  ) {
    blockchain.push(newBlock);
    updateBalances(newBlock.transactions);
    console.log("Block added to blockchain:", newBlock);

    // Remove transactions included in the new block from the transaction pool
    removeMinedTransactions(newBlock.transactions);

    // Broadcast the updated transaction pool to all miners
    broadcastTransactionPool();

    return true;
  } else if (!lastBlock && newBlock.index === 0) {
    blockchain.push(newBlock);
    updateBalances(newBlock.transactions);
    console.log("Genesis block added to blockchain:", newBlock);
    return true;
  } else {
    console.error("Block validation failed");
    if (lastBlock.hash !== newBlock.previousHash) {
      console.error("Previous hash mismatch");
    }
    if (newBlock.index !== lastBlock.index + 1) {
      console.error("Index mismatch");
    }
    if (!validateBlock(newBlock, difficulty)) {
      console.error("Block does not satisfy the difficulty requirement");
    }
  }
  return false;
}

function removeMinedTransactions(minedTransactions) {
  transactionPool = transactionPool.filter((tx) => {
    return !minedTransactions.some((minedTx) => minedTx.hash === tx.hash);
  });
  console.log("Updated transaction pool after mining:", transactionPool);
}

function broadcastTransactionPool() {
  miners.forEach((miner) => {
    miner.send(JSON.stringify({ type: "transactionPool", transactionPool }));
  });
  console.log("Broadcasted updated transaction pool to all miners");
}

function adjustDifficulty() {
  const blocksToConsider = blockchain.slice(-adjustmentInterval);

  const totalBlockTime = blocksToConsider.reduce((total, block, index) => {
    if (index > 0) {
      return total + (block.timestamp - blocksToConsider[index - 1].timestamp);
    }
    return total;
  }, 0);

  const averageBlockTime = totalBlockTime / (blocksToConsider.length - 1);

  if (averageBlockTime < desiredBlockTime) {
    // 30 seconds in milliseconds
    difficulty++;
    console.log("Difficulty increased to:", difficulty);
  } else if (averageBlockTime > desiredBlockTime && difficulty > 1) {
    difficulty--;
    console.log("Difficulty decreased to:", difficulty);
  }
}

function updateBalances(transactions) {
  transactions.forEach((tx) => {
    const { publicKey, recipient, amount } = tx;

    const sender = publicKeyToAddress(publicKey);
    if (sender === undefined) {
      console.log("Invalid sender address");
      return;
    }
    if (balances[sender] !== undefined) {
      balances[sender] -= amount;
    } else {
      balances[sender] = -amount;
    }

    if (balances[recipient] !== undefined) {
      balances[recipient] += amount;
    } else {
      balances[recipient] = amount;
    }
  });

  console.log("Updated balances:", balances);
}

//RPC ENDPOINTS

// Return the entire blockchain history
app.get("/getBlockchainStats", (req, res) => {
  res.json({ blockchain, difficulty });
});

// Get Block by Index
app.get("/getBlock/:index", (req, res) => {
  const { index } = req.params;
  const block = blockchain.find((b) => b.index == index);
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }
  res.json(block);
});

// Get Latest Block
app.get("/getLatestBlock", (req, res) => {
  const latestBlock = blockchain[blockchain.length - 1];
  res.json(latestBlock);
});

// Get Transaction by Hash
app.get("/getTransaction/:hash", (req, res) => {
  const { hash } = req.params;
  let transaction = null;

  blockchain.forEach((block) => {
    block.transactions.forEach((tx) => {
      if (tx.hash === hash) {
        transaction = tx;
      }
    });
  });

  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  res.json(transaction);
});

// Get Transaction History for a Specific Address
app.get("/getTransactionHistory/:address", (req, res) => {
  const { address } = req.params;
  let transactionHistory = [];

  blockchain.forEach((block) => {
    block.transactions.forEach((tx) => {
      if (tx.senderAddress  === address || tx.recipient === address) {
        transactionHistory.push({
          ...tx,
          status: "confirmed",
          blockIndex: block.index,
          timestamp: block.timestamp,
        });
      }
    });
  });
  res.json({"Transactions": transactionHistory});
});

// Get Transaction Count for a Specific Address
app.get("/getTransactionCount/:address", (req, res) => {
  const { address } = req.params;
  let transactionCount = 0;

  blockchain.forEach((block) => {
    block.transactions.forEach((tx) => {
      if (tx.senderAddress === address || tx.recipient === address) {
        transactionCount++;
      }
    });
  });

  const pendingTransactions = transactionPool.filter(
    (tx) => tx.senderAddress === address || tx.recipient === address
  );
  transactionCount += pendingTransactions.length;

  res.json({ address, transactionCount });
});

//Return Difficulty
app.get("/getDifficulty", (req, res) => {
  res.json({ "Current Difficulty": difficulty });
});

app.listen(Central_RPC_PORT, () => {
  console.log(
    `Central Server RPC server running on http://localhost:${Central_RPC_PORT}`
  );
});
console.log("Central server running on ws://localhost:8080");
