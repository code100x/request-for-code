const WebSocket = require("ws");
const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");

const { ECPairFactory } = require("ecpair");
const ECPair = ECPairFactory(ecc);

const bip32 = BIP32Factory(ecc);

const centralServerUrl = "ws://localhost:8080";
let ws;

let blockchain = [];
let mempool = [];
let utxoSet = new Map();

const BLOCK_REWARD = 50 * 100000000; // 50 BTC in satoshis
const DIFFICULTY = 4; // Number of leading zeros required in hash

let isMining = false;
let hasReceivedBlockchain = false;
let hasReceivedUTXOSet = false;

let difficulty = DIFFICULTY;
function adjustDifficulty() {
  const BLOCK_TIME = 60000; // 1 minute in milliseconds
  const ADJUSTMENT_FACTOR = 0.25;

  if (blockchain.length > 1) {
    const lastBlock = blockchain[blockchain.length - 1];
    const prevBlock = blockchain[blockchain.length - 2];
    const timeElapsed = lastBlock.timestamp - prevBlock.timestamp;

    if (timeElapsed < BLOCK_TIME * (1 - ADJUSTMENT_FACTOR)) {
      difficulty++;
    } else if (timeElapsed > BLOCK_TIME * (1 + ADJUSTMENT_FACTOR)) {
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
          isValidChain(data.blockchain) &&
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
          mempool = mempool.filter(
            (tx) =>
              !data.block.transactions.some((blockTx) => blockTx.id === tx.id)
          );
        }
        break;
      case "NEW_TRANSACTION":
        console.log("************verifying transaction************");
        if (isValidTransaction(data.transaction)) {
          mempool.push(data.transaction);
        }
        break;
      case "NEW_CHAIN":
        if (
          isValidChain(data.blockchain) &&
          data.blockchain.length > blockchain.length
        ) {
          blockchain = data.blockchain;
          console.log("Updated to new longer chain");
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
setInterval(cleanupMempool, 60 * 60 * 1000); //

function mineBlock() {
  adjustDifficulty();
  const lastBlock = blockchain[blockchain.length - 1];

  const newBlock = {
    index: lastBlock ? lastBlock.index + 1 : 0,
    timestamp: Date.now(),
    transactions: selectTransactionsForBlock().map((tx) => tx.toHex()),
    previousHash: lastBlock ? lastBlock.hash : "0".repeat(64),
    nonce: 0,
  };

  // Add coinbase transaction
  const coinbaseTx = {
    id: crypto.randomBytes(32).toString("hex"),
    inputs: [],
    outputs: [{ address: minerAddress, amount: BLOCK_REWARD }],
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
  ws.send(JSON.stringify({ type: "NEW_BLOCK", block: newBlock }));
  //   addBlockToChain(newBlock);
}

function calculateBlockHash(block) {
  const data =
    block.index +
    block.previousHash +
    block.timestamp +
    JSON.stringify(block.transactions) +
    block.nonce;
  return crypto.createHash("sha256").update(data).digest("hex");
}

function selectTransactionsForBlock() {
  // Verify transactions before including them
  const selectedTxs = [];
  let totalSize = 0;
  const MAX_BLOCK_SIZE = 1000000; // 1MB

  for (const tx of mempool) {
    const txSize = JSON.stringify(tx).length;
    if (totalSize + txSize <= MAX_BLOCK_SIZE && isValidTransaction(tx)) {
      selectedTxs.push(tx);
      totalSize += txSize;
    }
    if (selectedTxs.length >= 10 || totalSize >= MAX_BLOCK_SIZE) break;
  }

  return selectedTxs;
}

function isValidProofOfWork(block) {
  const hash = calculateBlockHash(block);
  return hash.startsWith("0".repeat(difficulty)) && hash === block.hash;
}

function isValidBlockStructure(block) {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    Array.isArray(block.transactions) &&
    typeof block.nonce === "number"
  );
}

function isValidNewBlock(newBlock, previousBlock) {
  if (!isValidBlockStructure(newBlock)) {
    console.log("Invalid block structure");
    return false;
  }

  if (!isValidProofOfWork(newBlock)) {
    console.log("Invalid proof of work");
    return false;
  }

  if (newBlock.index === 0) {
    return true; // Genesis block is always valid
  }

  if (!previousBlock) {
    console.log("Previous block is undefined");
    return false;
  }

  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("Invalid index");
    return false;
  }
  if (previousBlock.hash !== newBlock.previousHash) {
    console.log("Invalid previous hash");
    return false;
  }

  return true;
}

function isValidChain(chainToValidate) {
  if (JSON.stringify(chainToValidate[0]) !== JSON.stringify(blockchain[0])) {
    return false;
  }
  for (let i = 1; i < chainToValidate.length; i++) {
    if (!isValidNewBlock(chainToValidate[i], chainToValidate[i - 1])) {
      return false;
    }
  }
  return true;
}

function addBlockToChain(newBlock) {
  if (isValidNewBlock(newBlock, blockchain[blockchain.length - 1])) {
    console.log("Adding new block to chain", newBlock.index);
    blockchain.push(newBlock);
    updateUTXOSet(newBlock);
    return true;
  }
  return false;
}

function isValidTransaction(transaction) {
  if (
    !transaction.inputs ||
    !transaction.outputs ||
    !Array.isArray(transaction.inputs) ||
    !Array.isArray(transaction.outputs) ||
    !transaction.signature ||
    !transaction.publicKey
  ) {
    return false;
  }

  // Special case for initial balance transactions
  if (transaction.inputs.length === 0 && transaction.outputs.length === 1) {
    return true;
  }
  // Check if all inputs are unspent
  for (const input of transaction.inputs) {
    const utxoKey = `${input.txid}:${input.vout}`;
    if (!utxoSet.has(utxoKey)) {
      return false;
    }
  }

  try {
    const { signature, publicKey, ...transactionData } = transaction;
    const transactionBuffer = Buffer.from(JSON.stringify(transactionData));
    const sigHash = bitcoin.crypto.hash256(transactionBuffer);

    const signatureBuffer = Buffer.from(signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");

    const pubKeyPair = ECPair.fromPublicKey(publicKeyBuffer);

    if (!pubKeyPair.verify(sigHash, signatureBuffer)) {
      console.log("Invalid signature");
      return false;
    }
  } catch (e) {
    console.log("Error verifying signature:", e);
    return false;
  }
  // Check if total input amount is greater than or equal to total output amount
  const totalInput = transaction.inputs.reduce((sum, input) => {
    const utxo = utxoSet.get(`${input.txid}:${input.vout}`);
    return sum + utxo.amount;
  }, 0);

  const totalOutput = transaction.outputs.reduce(
    (sum, output) => sum + output.amount,
    0
  );

  if (totalInput < totalOutput) {
    return false;
  }

  return true;
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

// Generate a new address for the miner
const keyPair = bip32
  .fromSeed(crypto.randomBytes(32))
  .derivePath("m/44'/0'/0'/0/0");
const { address: minerAddress } = bitcoin.payments.p2pkh({
  pubkey: keyPair.publicKey,
});

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
  setTimeout(miningLoop, 1000 * 60); // Mine a new block every 1 minute
}

// Start the miner
connectToServer();
