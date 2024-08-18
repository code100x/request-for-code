// minerServer.js
const WebSocket = require("ws");
const express = require("express");
const {
  generateBlockHash,
  publicKeyToAddress,
  createTransaction,
  validateTransaction,
  validateBlock,
} = require("./blockchainUtils");
const EC = require("elliptic").ec;
const net = require("net");

const app = express();
app.use(express.json());
let PORT = 3000;

const ec = new EC("secp256k1");

let miningInterval = null; // Store the mining interval
let resyncTimeout = null; // Timeout for resync after block rejection

const resyncThreshold = 4; // Number of seconds to wait before resyncing
const miningIntervalTime = 30000; // Time in milliseconds between mining blocks

// If 3000 already in use, try 3001 or 3002
function checkPortInUse(PORT, callback) {
  const server = net.createServer();
  server.once("error", function (err) {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is in use, trying another port`);
      PORT++;
      checkPortInUse(PORT, callback);
    } else {
      callback(err);
    }
  });

  server.once("listening", function () {
    server.close();
    callback(null, PORT);
  });

  server.listen(PORT);
}

checkPortInUse(PORT, (err, availablePort) => {
  if (err) {
    console.error("Error checking port:", err);
  } else {
    PORT = availablePort;
    console.log("Launching server on port", PORT);
    launchServer();
  }
});

function launchServer() {

  const ws = new WebSocket("ws://localhost:8080");

  let blockchain = []; // Store blockchain in-memory
  let transactionPool = []; // Local pool for unconfirmed transactions
  let difficulty; // Difficulty will be updated by the central server
  let balances = {}; // Ledger to track account balances

  app.post("/sendTransaction", (req, res) => {
    const { recipient, amount, privateKey } = req.body;
    if (amount <= 0) {
      return res.status(400).send("Amount must be greater than 0");
    }
    if (recipient.length !== 40) {
      return res.status(400).send("Invalid recipient address");
    }
    if (privateKey.length !== 64) {
      return res.status(400).send("Invalid private key");
    }
    sendTransaction(recipient, amount, privateKey);
    res.send("Transaction processed");
  });

  // Expose getBalances via an Express API
  app.get("/getBalances", (req, res) => {
    res.send(balances);
  });

  console.log("Sending balances response:", balances);
  // Expose getBlockHeight via an Express API
  app.get("/getBlockHeight", (req, res) => {
    res.send({ blockHeight: blockchain.length });
  });

  // Expose getBalance of a specific address via an Express API
  app.get("/getBalance/:address", (req, res) => {
    const { address } = req.params;
    res.send({ balance: balances[address] || 0 });
  });

  // Get Mining Info
  app.get("/miningInfo", (req, res) => {
    res.json({
      mining: miningInterval !== null,
      difficulty,
      blockHeight: blockchain.length,
    });
  });

  // Get Pending Transactions
  app.get("/pendingTransactions", (req, res) => {
    res.json({ transactionPool });
  });

  // Get Pending Transactions by Sender Address
  app.get("/getPendingTransactionsByAccount/:address", (req, res) => {
    const { address } = req.params;

    const pendingTransactions = transactionPool.filter((tx) => {
      const senderAddress = publicKeyToAddress(tx.publicKey);
      
      return (
        senderAddress === address|| tx.recipient === address
      );
    });

    if (pendingTransactions.length === 0) {
      return res
        .status(404)
        .json({ error: "No pending transactions found for this address" });
    }

    res.json({ pendingTransactions });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });


  ws.on("open", () => {
    console.log("Connected to central server");
    // Request the current blockchain and balances from the central server
    ws.send(JSON.stringify({ type: "request_blockchain" }));
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "block_accepted") {
      console.log("Block accepted:", data.block);
      clearTimeout(resyncTimeout); // Clear resync timeout
      blockchain.push(data.block);
      updateLocalBalances(data.block.transactions);
      // Start mining the next block
      miningInterval = setTimeout(mineBlock, miningIntervalTime); // Adjust the interval as needed
    } else if (data.type === "block_rejected") {
      console.log("Block rejected:", data.block);
      console.log("Waiting for the correct block from the central server...");

      resyncTimeout = setTimeout(() => {
        console.log(
          "No new block received. Resyncing with the central server..."
        );
        ws.send(JSON.stringify({ type: "request_blockchain" }));
      }, resyncThreshold * 1000);
    } else if (data.type === "block") {
      console.log(
        "New block received, stopping current mining and updating blockchain."
      );
      clearInterval(miningInterval); // Stop current mining
      clearTimeout(resyncTimeout); // Clear resync timeout
      handleReceivedBlock(data.block);
      difficulty = data.difficulty; // Update difficulty
      balances = data.balances; // Update balances
    } else if (data.type === "blockchain") {
      console.log("Blockchain received from central server. Validating...");
      validateReceivedBlockchain(
        data.blockchain,
        data.difficulty,
        data.balances
      );
    } else if (data.type === "transaction") {
      console.log("Received transaction from central server, adding to pool");
      transactionPool.push(data.transaction);
    } else if (data.type === "transactionPool") {
      console.log("Received updated transaction pool from central server");
      transactionPool = data.transactionPool;
    }
  });

  function validateReceivedBlockchain(
    receivedBlockchain,
    receivedDifficulty,
    receivedBalances
  ) {
    const localLastBlock = blockchain[blockchain.length - 1];
    const receivedLastBlock = receivedBlockchain[receivedBlockchain.length - 1];

    // Accept the received blockchain if it's longer or if the heights are equal and hashes match
    if (
      receivedBlockchain.length > blockchain.length ||
      (receivedBlockchain.length === blockchain.length &&
        receivedLastBlock.hash === localLastBlock.hash)
    ) {
      console.log("Received blockchain is valid. Updating local blockchain.");
      blockchain = receivedBlockchain;
      difficulty = receivedDifficulty;
      balances = receivedBalances;
      clearTimeout(resyncTimeout); // Clear resync timeout
      miningInterval = setTimeout(mineBlock, miningIntervalTime); // Start mining again
    } else {
      console.log(
        "Received blockchain is shorter and hashes do not match. Ignoring..."
      );
    }
  }

  function mineBlock() {
    const previousBlock = blockchain[blockchain.length - 1];
    const previousHash = previousBlock ? previousBlock.hash : "";
    let nonce = 0;
    let hash;
    const index = blockchain.length;
    const timestamp = Date.now();

    const validTransactions =
      transactionPool.filter((tx) => validateTransaction(tx, balances)) || [];

    do {
      nonce++;
      hash = generateBlockHash({
        index,
        timestamp,
        transactions: validTransactions,
        nonce,
        previousHash,
      });
    } while (hash.substring(0, difficulty) !== "0".repeat(difficulty));

    const block = {
      index,
      timestamp,
      transactions: validTransactions,
      nonce,
      hash,
      previousHash,
    };

    console.log(`Block mined: ${JSON.stringify(block)}`);

    // Send the newly mined block to the central server
    ws.send(JSON.stringify({ type: "block", block }));
    console.log("Block sent to central server, waiting for confirmation");
  }

  function handleReceivedBlock(newBlock) {
    const lastBlock = blockchain[blockchain.length - 1];

    console.log("Received block:", newBlock);
    console.log("Current last block:", lastBlock);

    if (
      lastBlock &&
      lastBlock.hash === newBlock.previousHash &&
      newBlock.index === lastBlock.index + 1
    ) {
      blockchain.push(newBlock);
      updateLocalBalances(newBlock.transactions);
      console.log("New block added to the chain:", newBlock);

      // Remove transactions from transaction pool that are in the new block
      transactionPool = transactionPool.filter(
        (tx) => !newBlock.transactions.includes(tx)
      );

      console.log(
        "Updated transaction pool after block acceptance:",
        transactionPool
      );

      // Start mining the next block
      miningInterval = setTimeout(mineBlock, miningIntervalTime); // Adjust the interval as needed
    } else {
      console.log("Invalid block rejected");
    }
  }

  function updateLocalBalances(transactions) {
    transactions.forEach(tx => {
        const { publicKey, recipient, amount } = tx;

        const sender = publicKeyToAddress(publicKey);
        if (sender === undefined) {
            console.log('Invalid sender address');
            return;
        }

        if (balances[sender] !== undefined) {
            balances[sender] -= amount;
        }

        if (balances[recipient] !== undefined) {
            balances[recipient] += amount;
        } else {
            balances[recipient] = amount;
        }
    });

    console.log('Updated local balances:', balances);
}
  
  function handleTransaction(transaction) {
    if (validateTransaction(transaction, balances)) {
      transactionPool.push(transaction);
      console.log(
        "Transaction added to local pool and broadcasting to central server"
      );

      // Broadcast the valid transaction to the central server
      ws.send(JSON.stringify({ type: "transaction", transaction }));
    } else {
      console.log("Invalid transaction rejected");
    }
  }

  function sendTransaction(recipient, amount, privateKey) {
    const key = ec.keyFromPrivate(privateKey, "hex");
    const publicKey = key.getPublic().encode("hex");
    const senderAddress = publicKeyToAddress(publicKey);

    if (
      balances[senderAddress] === undefined ||
      balances[senderAddress] < amount
    ) {
      console.log("Insufficient balance to send the transaction");
      return;
    }

    const transaction = createTransaction(
      publicKey,
      senderAddress,
      recipient,
      amount,
      privateKey
    );
    handleTransaction(transaction);
  }

  setTimeout(mineBlock, miningIntervalTime); // Start mining a block after a delay
}
