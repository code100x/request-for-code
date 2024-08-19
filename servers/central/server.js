const WebSocket = require("ws");
const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const { ECPairFactory } = require("ecpair");

const ECPair = ECPairFactory(ecc);

const network = bitcoin.networks.testnet;
const port = 8080;
const server = new WebSocket.Server({ port });

let blockchain = [];
const mempool = [];
const clients = new Set();
let utxoSet = new Map();

const INITIAL_BALANCE = 100 * 100000000; // 100 BTC in satoshis
const BLOCK_REWARD = 50 * 100000000; // 50 BTC in satoshis
const DIFFICULTY = 4; // Number of leading zeros required in hash
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB max message size
const MAX_MEMPOOL_SIZE = 1000; // Maximum number of transactions in mempool

function broadcastMessage(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
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

function isValidProofOfWork(block) {
  const hash = calculateBlockHash(block);
  return hash.startsWith("0".repeat(DIFFICULTY)) && hash === block.hash;
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

function isValidAddress(address) {
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch (e) {
    console.log("Invalid address error:", e);
    return false;
  }
}

function isValidTransaction(transaction, utxoSet) {
  if (!transaction) {
    console.log("No transaction data");
    return false;
  }

  if (
    !transaction.inputs ||
    !transaction.outputs ||
    !Array.isArray(transaction.inputs) ||
    !Array.isArray(transaction.outputs)
  ) {
    console.log("Invalid transaction structure 0");
    return false;
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
    console.log("Invalid transaction amount");
    return false;
  }

  // Check if all output addresses are valid
  for (const output of transaction.outputs) {
    if (!isValidAddress(output.address)) {
      console.log("Invalid output address");
      return false;
    }
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
        amount: INITIAL_BALANCE,
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
    amount: INITIAL_BALANCE,
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
  if (mempool.length >= MAX_MEMPOOL_SIZE) {
    // Remove oldest transaction if mempool is full
    mempool.shift();
  }
  mempool.push(transaction);
}

server.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (message) => {
    if (message.length > MAX_MESSAGE_SIZE) {
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
            balance: INITIAL_BALANCE,
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
