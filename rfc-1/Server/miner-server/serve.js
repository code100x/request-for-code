const WebSocket = require("ws");
const http = require("http");

const { Blockchain, Transaction, Block } = require("../main-server/blockChain");
const {
  PORT,
  RECONNECT_INTERVAL,
  MINING_INTERVAL,
  CENTRAL_SERVER_URL,
} = require("./config");

const port = process.argv[2] || PORT || 3001;
let ws;
let isConnected = false;

const minerChain = new Blockchain(false);
const minerAddress = "miner-wallet-address-" + port; // In a real scenario, this would be a proper wallet address

function connectToServer() {
  ws = new WebSocket(`${CENTRAL_SERVER_URL}/miner/${port}`);

  ws.on("open", () => {
    isConnected = true;
    console.log("Connected to central server");
    ws.send(JSON.stringify({ type: "REQUEST_CHAIN" }));
  });

  ws.on("message", (data) => {
    const message = JSON.parse(data);
    handleIncomingMessage(message);
  });

  ws.on("close", () => {
    isConnected = false;
    console.log(
      "Connection to central server lost. Attempting to reconnect..."
    );
    setTimeout(connectToServer, RECONNECT_INTERVAL);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    ws.close(); // Close connection and trigger reconnect
  });
}

function handleIncomingMessage(message) {
  switch (message.type) {
    case "CHAIN_UPDATE": {
      console.log("Received chain update from main", message.chain);
      const newChain = message.chain.map((blockData) => {
        const block = new Block(
          blockData.index,
          blockData.timestamp,
          blockData.transactions,
          blockData.previousHash
        );
        block.hash = blockData.hash;
        block.nonce = blockData.nonce;
        return block;
      });

      if (minerChain.replaceChain(newChain)) {
        console.log("Updated to new chain");
      } else {
        console.log("Chain update failed. Keeping the current chain.");
      }
      break;
    }

    case "NEW_TRANSACTION": {
      console.log(
        "Received new transaction from main server:",
        message.transaction
      );
      try {
        const newTransaction = new Transaction(
          message.transaction.fromAddress,
          message.transaction.toAddress,
          message.transaction.amount
        );
        minerChain.addTransaction(newTransaction, true);
      } catch (error) {
        console.error("Error adding transaction by miner:", error.message);
      }
      break;
    }

    default:
      console.log("Unknown message type:", message.type);
  }
}

function startMining() {
  setInterval(() => {
    if (minerChain.transactionPool.length >= minerChain.transactionsPerBlock) {
      console.log("Mining new block...");
      const minedBlock = minerChain.minePendingTransactions(minerAddress);
      if (minedBlock && isConnected) {
        ws.send(JSON.stringify({ type: "NEW_BLOCK", block: minedBlock }));
        console.log("Mined and broadcasted new block:", minedBlock);
      } else if (!minedBlock) {
        console.log("Failed to mine block");
      } else {
        console.log("Cannot broadcast block - not connected to server");
      }
    } else {
      console.log(
        `Waiting for more transactions. Current pool size: ${minerChain.transactionPool.length}`
      );
    }
  }, MINING_INTERVAL);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("miner client is alive!\n");
});

server.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
});

connectToServer();
startMining();
