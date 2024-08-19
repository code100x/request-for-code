const express = require("express");
const crypto = require("crypto");

const http = require("http");
const cors = require("cors");
const { PORT } = require("./config");

const WebSocket = require("ws");
const { Blockchain, Transaction, Block } = require("./blockChain");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors());

const mainChain = new Blockchain();

const minerClients = new Map();

wss.on("connection", (ws, req) => {
  const parts = req.url.split("/");
  console.log(`miner parts ${parts}`);

  if (parts[1] === "miner") {
    const minerPort = parts[2];
    minerClients.set(minerPort, ws);
    console.log(`Miner connected on port ${minerPort}`);

    // Send the current blockchain to the newly connected miner
    ws.send(
      JSON.stringify({
        type: "CHAIN_UPDATE",
        chain: mainChain.chain,
      })
    );

    ws.on("message", (message) => {
      const data = JSON.parse(message);
      switch (data.type) {
        case "NEW_BLOCK": {
          console.log("Received new block in main:", data.block);
          const newBlock = new Block(
            data.block.index,
            data.block.timestamp,
            data.block.transactions,
            data.block.previousHash
          );
          newBlock.hash = data.block.hash;
          newBlock.nonce = data.block.nonce;

          if (mainChain.addBlock(newBlock)) {
            console.log("broadcast about new block from here");
            removeConfirmedTransactions(newBlock.transactions);

            broadcastToMiners(
              JSON.stringify({
                type: "CHAIN_UPDATE",
                chain: mainChain.chain,
              })
            );
          }
          break;
        }
        case "REQUEST_CHAIN":
          ws.send(
            JSON.stringify({
              type: "CHAIN_UPDATE",
              chain: mainChain.chain,
            })
          );
          break;
      }
    });

    ws.on("close", () => {
      minerClients.delete(minerPort);
      console.log(`Miner on port ${minerPort} disconnected`);
    });
  }
});

function hashTransaction(transaction) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(transaction))
    .digest("hex");
}

function removeConfirmedTransactions(transactions) {
  const confirmedHashes = transactions.map(hashTransaction);
  if (confirmedHashes.length) {
    mainChain.transactionPool = mainChain.transactionPool.filter(
      (tx) => !confirmedHashes.includes(hashTransaction(tx))
    );
    mainChain.totalTransactions =
      mainChain.totalTransactions + transactions.length;
  }
}

function broadcastToMiners(message) {
  console.log(`Broadcasting message to miners: ${message}`);

  for (const [minerPort, client] of minerClients) {
    if (client.readyState === WebSocket.OPEN) {
      console.log(`Sending message to miner on port ${minerPort}`);
      client.send(message);
    }
  }
}

app.get("/", (req, res) => {
  res.send("Bitcoin-like Server");
});

app.get("/api/blocks", (req, res) => {
  res.json(mainChain.chain);
});

// Get a specific block by index
app.get("/api/blocks/:index", (req, res) => {
  const blockIndex = parseInt(req.params.index);
  if (blockIndex < 0 || blockIndex >= mainChain.chain.length) {
    return res.status(404).json({ error: "Block not found" });
  }
  res.json(mainChain.chain[blockIndex]);
});
// Get the latest block
app.get("/api/latest-block", (req, res) => {
  res.json(mainChain.getLatestBlock());
});
//to be changed
app.get("/api/last-n-blocks", (req, res) => {
  res.json(mainChain.getLastNBlocks(5));
});
// Validate the blockchain
app.get("/api/validate-chain", (req, res) => {
  const isValid = mainChain.isChainValid();
  res.json({ isValid });
});
// 2. Transaction Pool Visualizer API

app.get("/api/transaction-pool", (req, res) => {
  res.json(mainChain.transactionPool);
});

// Search functionality (basic implementation)
app.get("/api/search", (req, res) => {
  const { query } = req.query;

  // Search in blocks
  const block = mainChain.chain.find((b) => b.hash === query);
  if (block) return res.json({ type: "block", data: block });

  // Search in transactions (including those in blocks and in the pool)
  const poolTransaction = mainChain.transactionPool.find(
    (t) => t.fromAddress === query || t.toAddress === query
  );
  if (poolTransaction)
    return res.json({ type: "transaction", data: poolTransaction });

  const blockTransaction = mainChain.chain
    .flatMap((b) => b.transactions)
    .find((t) => t.fromAddress === query || t.toAddress === query);
  if (blockTransaction)
    return res.json({ type: "transaction", data: blockTransaction });

  res.status(404).json({ error: "Not found" });
});

app.get("/chain-info", (req, res) => {
  res.send({
    totalBlocks: mainChain?.chain?.length,
    totalTransactions: mainChain.totalTransactions,
    currentDifficulty: mainChain.difficulty,
  });
});

app.post("/transaction", (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;
  console.log(
    `recieved transaction from client${fromAddress}  -   ${toAddress}  -  ${amount}`
  );

  try {
    const transaction = new Transaction(fromAddress, toAddress, amount);
    mainChain.addTransaction(transaction, true);
    console.log("Broadcasting new transaction to miners");

    broadcastToMiners(
      JSON.stringify({
        type: "NEW_TRANSACTION",
        transaction,
      })
    );
    res.json({ message: "Transaction added to pool  successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
