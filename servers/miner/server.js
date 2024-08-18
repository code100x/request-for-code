const WebSocket = require("ws");
const crypto = require("crypto");
const secp256k1 = require("secp256k1");

const BLOCK_REWARD = 10;

const CENTRAL_SERVER = "ws://localhost:8080";
const DIFFICULTY = 4; // Number of leading zeros required in block hash

let blockchain = [];
let mempool = [];
let utxoSet = new Map();

const ws = new WebSocket(CENTRAL_SERVER);

ws.on("open", () => {
  console.log("Connected to central server");
  startMining();
});

ws.on("message", (message) => {
  const msg = JSON.parse(message);

  switch (msg.type) {
    case "BLOCKCHAIN":
      blockchain = msg.data;
      break;
    case "NEW_BLOCK":
      if (verifyBlock(msg.data)) {
        blockchain.push(msg.data);
        // Remove mined transactions from mempool
        mempool = mempool.filter((tx) => !msg.data.transactions.includes(tx));
      }
      break;
    case "NEW_TRANSACTION":
      mempool.push(msg.data);
      break;
  }
});

function startMining() {
  setInterval(() => {
    if (mempool.length > 0) {
      const block = createBlock();
      if (mineBlock(block)) {
        ws.send(JSON.stringify({ type: "NEW_BLOCK", data: block }));
      }
    }
  }, 10000); // Try to mine a block every 10 seconds
}

function createBlock() {
  const previousBlock = blockchain[blockchain.length - 1];
  return {
    index: blockchain.length,
    timestamp: Date.now(),
    transactions: mempool.slice(0, 10), // Include up to 10 transactions
    previousHash: previousBlock ? hashBlock(previousBlock) : "0",
    nonce: 0,
  };
}

function mineBlock(block) {
  while (!hashBlock(block).startsWith("0".repeat(DIFFICULTY))) {
    block.nonce++;
  }
  return true;
}

/**
 * TOOK HELP FROM CHATGPT HERE
 */

function verifyTransaction(tx, mempool) {
  // 1. Basic structure check
  if (!tx.id || !tx.inputs || !tx.outputs || !tx.timestamp || !tx.signature) {
    console.log("Transaction is missing required fields");
    return false;
  }

  // 2. Check if transaction is not already in the mempool (prevent double-spending)
  if (mempool.some((memTx) => memTx.id === tx.id)) {
    console.log("Transaction is already in the mempool");
    return false;
  }

  // 3. Verify transaction ID
  const calculatedTxId = calculateTransactionHash(tx);
  if (calculatedTxId !== tx.id) {
    console.log("Transaction ID is invalid");
    return false;
  }

  // 4. Check that inputs are in the UTXO set and not already spent
  let inputSum = 0;
  for (let input of tx.inputs) {
    const utxo = utxoSet.get(input.txOutId + ":" + input.txOutIndex);
    if (!utxo) {
      console.log("Input refers to a non-existent or already spent output");
      return false;
    }
    inputSum += utxo.amount;
  }

  // 5. Verify that input amount equals output amount
  const outputSum = tx.outputs.reduce((sum, output) => sum + output.amount, 0);
  if (inputSum !== outputSum) {
    console.log("Input amount does not equal output amount");
    return false;
  }

  // 6. Verify the signature
  const txData = {
    inputs: tx.inputs,
    outputs: tx.outputs,
    timestamp: tx.timestamp,
  };
  const txDataHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(txData))
    .digest();

  try {
    if (
      !secp256k1.ecdsaVerify(
        Buffer.from(tx.signature, "hex"),
        txDataHash,
        Buffer.from(tx.inputs[0].publicKey, "hex")
      )
    ) {
      console.log("Transaction signature is invalid");
      return false;
    }
  } catch (err) {
    console.log("Error verifying signature:", err.message);
    return false;
  }

  console.log("Transaction verified successfully");
  return true;
}

function calculateTransactionHash(tx) {
  const txData = {
    inputs: tx.inputs,
    outputs: tx.outputs,
    timestamp: tx.timestamp,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(txData))
    .digest("hex");
}

// Function to update UTXO set when a new block is added
function updateUTXOSet(block) {
  for (let tx of block.transactions) {
    // Remove spent outputs
    for (let input of tx.inputs) {
      utxoSet.delete(input.txOutId + ":" + input.txOutIndex);
    }

    // Add new unspent outputs
    tx.outputs.forEach((output, index) => {
      utxoSet.set(tx.id + ":" + index, {
        amount: output.amount,
        publicKeyHash: output.publicKeyHash, // The recipient's public key hash
      });
    });
  }
}

function verifyBlock(newBlock) {
  /**
   * Check if the block contains all required fields
   */
  if (
    !newBlock.index ||
    !newBlock.timestamp ||
    !newBlock.transactions ||
    !newBlock.previousHash ||
    !newBlock.nonce
  ) {
    console.log("*****block is missing required fields");
    return false;
  }

  /**
   * Check if the block index is correct
   * (equal to the length of the blockchain)
   */
  if (newBlock.index !== blockchain.length) {
    console.log("*****block index is incorrect*****");
    return false;
  }

  /**
   *  Check if the timestamp is in the past and not too far
   */
  const currentTime = Date.now();
  if (
    newBlock.timestamp > currentTime ||
    (blockchain.length > 0 &&
      newBlock.timestamp <= blockchain[blockchain.length - 1].timestamp)
  ) {
    console.log("*****block timestamp is invalid*****");
    return false;
  }

  /**
   * Check if the previous hash matches
   * the hash of the last block in the chain
   */
  if (blockchain.length > 0) {
    const previousBlock = blockchain[blockchain.length - 1];
    if (newBlock.previousHash !== hashBlock(previousBlock)) {
      console.log("*****previous hash is incorrect*****");
      return false;
    }
  }

  /**
   * Check if the hash of the block satisfies
   * the proof-of-work requirement
   */
  if (!hashBlock(newBlock).startsWith("0".repeat(DIFFICULTY))) {
    console.log("*****proof-of-work is invalid*****");
    return false;
  }

  /**
   * Check if all transactions in the block are valid
   */
  for (let tx of newBlock.transactions) {
    if (!verifyTransaction(tx)) {
      console.log("*****transaction verification failed*****");
      return false;
    }
  }

  /**
   * Check if the coinbase transaction is valid
   * (first transaction in the block)
   */
  if (
    newBlock.transactions[0].from !== "coinbase" ||
    newBlock.transactions[0].amount !== BLOCK_REWARD
  ) {
    console.log("*****invalid coinbase transaction*****");
    return false;
  }

  /**
   * Check for double spending within the block
   */
  const txInputs = new Set();
  for (let tx of newBlock.transactions.slice(1)) {
    // Skip coinbase transaction
    if (txInputs.has(tx.from)) {
      console.log("*****double spending detected within block*****");
      return false;
    }
    txInputs.add(tx.from);
  }

  console.log("*****block verified successfully****");

  // Update the UTXO set with the new block
  updateUTXOSet(newBlock);
  return true;
}

function verifyTransaction(tx) {
  // This is a simplified transaction verification
  // In a real system, you'd check signatures, verify that inputs are unspent, etc.
  if (!tx.from || !tx.to || !tx.amount || tx.amount <= 0) {
    return false;
  }

  // Verify signature (simplified)
  const txData = {
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    timestamp: tx.timestamp,
  };
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(txData))
    .digest("hex");

  // In a real system, you'd use proper cryptographic verification here
  return tx.signature && tx.signature.length > 0;
}

function hashBlock(block) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(block))
    .digest("hex");
}

console.log("Miner server started");
