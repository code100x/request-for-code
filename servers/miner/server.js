const WebSocket = require("ws");
const crypto = require("crypto");

const { MINER_CONFIG } = require("./utils/constant");
const {
  isValidTransaction,
  isValidChain,
  isValidNewBlock,
  minerAddress,
  calculateBlockHash,
} = require("./utils/utils");

const centralServerUrl = "ws://localhost:8080";
let ws;

let blockchain = [];
let mempool = [];
let utxoSet = new Map();

let isMining = false;
let hasReceivedBlockchain = false;
let hasReceivedUTXOSet = false;

let difficulty = MINER_CONFIG.DIFFICULTY;

function adjustDifficulty() {
  if (blockchain.length > 1) {
    const lastBlock = blockchain[blockchain.length - 1];
    const prevBlock = blockchain[blockchain.length - 2];
    const timeElapsed = lastBlock.timestamp - prevBlock.timestamp;

    if (
      timeElapsed <
      MINER_CONFIG.BLOCK_TIME * (1 - MINER_CONFIG.ADJUSTMENT_FACTOR)
    ) {
      difficulty++;
    } else if (
      timeElapsed >
      MINER_CONFIG.BLOCK_TIME * (1 + MINER_CONFIG.ADJUSTMENT_FACTOR)
    ) {
      difficulty = Math.max(1, difficulty - 1);
    }
  }
}

function connectToServer() {
  ws = new WebSocket(centralServerUrl);

  ws.on("open", () => {
    console.log("Connected to central server");
    ws.send(JSON.stringify({ type: "GET_BLOCKCHAIN" }));
    ws.send(JSON.stringify({ type: "GET_UTXO_SET" }));
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "BLOCKCHAIN":
        if (blockchain.length === 0) {
          blockchain = data.blockchain;
          console.log("Updated blockchain. Current length:", blockchain.length);
          hasReceivedBlockchain = true;
          checkStartMining();
        } else if (
          isValidChain(data.blockchain, difficulty) &&
          data.blockchain.length > blockchain.length
        ) {
          blockchain = data.blockchain;
          console.log("Updated blockchain. Current length:", blockchain.length);
          hasReceivedBlockchain = true;
          checkStartMining();
        }
        break;
      case "UTXO_SET":
        utxoSet = new Map(
          data.utxoSet.map((utxo) => [`${utxo.txid}:${utxo.vout}`, utxo])
        );
        hasReceivedUTXOSet = true;
        checkStartMining();
        break;
      case "NEW_BLOCK":
        if (addBlockToChain(data.block)) {
          console.log("*****Added new block to chain*****", data.block.index);
          // Remove transactions in the new block from our mempool
        }
        break;
      case "NEW_TRANSACTION":
        console.log("************verifying transaction************");
        if (isValidTransaction(data.transaction, utxoSet)) {
          console.log("Received valid transaction", mempool);
          mempool.push(data.transaction);
          updateLocalUTXOSet(data.transaction);
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("Disconnected from central server. Attempting to reconnect...");
    isMining = false;
    hasReceivedBlockchain = false;
    hasReceivedUTXOSet = false;
    setTimeout(connectToServer, 5000);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

function updateLocalUTXOSet(transactionOrTransactions) {
  const transactions = Array.isArray(transactionOrTransactions)
    ? transactionOrTransactions
    : [transactionOrTransactions];

  transactions.forEach((transaction) => {
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
  });
}

function removeTransactionsFromMempool(transactions) {
  const transactionIds = new Set(transactions.map((tx) => tx.id));
  mempool = mempool.filter((tx) => !transactionIds.has(tx.id));
}

function checkStartMining() {
  if (hasReceivedBlockchain && hasReceivedUTXOSet && !isMining) {
    startMining();
  }
}

function cleanupMempool() {
  const currentTime = Date.now();
  mempool = mempool.filter(
    (tx) => currentTime - tx.timestamp < 24 * 60 * 60 * 1000
  ); // Remove transactions older than 24 hours
}
setInterval(cleanupMempool, 1000 * 60 * 30); // Cleanup mempool every 30 minutes

function mineBlock() {
  adjustDifficulty();
  const lastBlock = blockchain[blockchain.length - 1];

  const newBlock = {
    index: lastBlock ? lastBlock.index + 1 : 0,
    timestamp: Date.now(),
    transactions: selectTransactionsForBlock(),
    previousHash: lastBlock ? lastBlock.hash : "0".repeat(64),
    nonce: 0,
  };

  // Add coinbase transaction
  const coinbaseTx = {
    id: crypto.randomBytes(32).toString("hex"),
    inputs: [],
    outputs: [{ address: minerAddress, amount: MINER_CONFIG.BLOCK_REWARD }],
    timestamp: Date.now(),
  };
  newBlock.transactions.unshift(coinbaseTx);

  while (true) {
    newBlock.hash = calculateBlockHash(newBlock);
    if (newBlock.hash.startsWith("0".repeat(difficulty))) {
      break;
    }
    newBlock.nonce++;
  }
  console.log("***** Mined new block****", newBlock.index);
  ws.send(JSON.stringify({ type: "NEW_BLOCK", block: newBlock, difficulty }));
  // addBlockToChain(newBlock);
}

function selectTransactionsForBlock() {
  // Verify transactions before including them
  const selectedTxs = [];
  let totalSize = 0;

  for (const tx of mempool) {
    const txSize = JSON.stringify(tx).length;
    if (
      totalSize + txSize <= MINER_CONFIG.MAX_BLOCK_SIZE &&
      isValidTransaction(tx, utxoSet)
    ) {
      selectedTxs.push(tx);
      totalSize += txSize;
    }
    if (selectedTxs.length >= 10 || totalSize >= MINER_CONFIG.MAX_BLOCK_SIZE)
      break;
  }

  return selectedTxs;
}

function addBlockToChain(newBlock) {
  if (
    isValidNewBlock(newBlock, blockchain[blockchain.length - 1], difficulty)
  ) {
    console.log("Adding new block to chain", newBlock.index);
    blockchain.push(newBlock);
    updateLocalUTXOSet(newBlock.transactions);
    removeTransactionsFromMempool(newBlock.transactions);
    return true;
  }
  return false;
}

// Generate a new address for the miner

console.log(`Miner address: ${minerAddress}`);

// Start mining
function startMining() {
  if (isMining) return;
  isMining = true;
  console.log("Starting mining process...");
  miningLoop();
}

function miningLoop() {
  if (!isMining) return;
  mineBlock();
  // if (mempool.length > 0) {
  //   mineBlock();
  // } else {
  //   console.log("No transactions in mempool, waiting...");
  // }
  setTimeout(miningLoop, 1000 * 60 * 2); // Mine a new block every 2 minutes
}
// Start the miner
connectToServer();
