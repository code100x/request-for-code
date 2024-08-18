import express from "express";
import http from "http";
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Ensure this is correct
    methods: ["GET", "POST"],
  },
});
const centralServer = ClientIO("http://localhost:3001"); // Connect to Central Server

let localBlockchain: any[] = [];

// Function to calculate hash for a block
function calculateHash(
  index: number,
  prevHash: string,
  timestamp: number,
  data: string
): string {
  return crypto
    .createHash("sha256")
    .update(index + prevHash + timestamp + data)
    .digest("hex");
}

// Proof of Work
function proofOfWork(
  index: number,
  prevHash: string,
  timestamp: number,
  data: string,
  difficulty: number
): { hash: string; nonce: number } {
  let nonce = 0;
  let hash: string;

  do {
    nonce++;
    hash = calculateHash(index, prevHash, timestamp, data + nonce);
  } while (hash.substring(0, difficulty) !== Array(difficulty + 1).join("0"));

  return { hash, nonce };
}

// Validate the new block
function isValidNewBlock(newBlock: any, previousBlock: any): boolean {
  if (previousBlock.index + 1 !== newBlock.index) return false;
  if (previousBlock.hash !== newBlock.prevHash) return false;
  if (
    calculateHash(
      newBlock.index,
      newBlock.prevHash,
      newBlock.timestamp,
      newBlock.data + newBlock.nonce
    ) !== newBlock.hash
  )
    return false;

  return true;
}

// Handle blockchain updates from central server
centralServer.on("blockchain", (blockchain) => {
  localBlockchain = blockchain;
  console.log("Blockchain received from central server");
});

// Handle new block from miners
io.on("connection", (socket) => {
  let user = socket.id;
  console.log("Miner connected to miner server", socket.id);
  socket.emit("user", user)

  // Send current blockchain to the newly connected miner
  socket.emit("blockchain", localBlockchain);

  // Listen for new block mining requests
  socket.on("mineBlock", (data) => {
    const lastBlock =
      localBlockchain.length > 0
        ? localBlockchain[localBlockchain.length - 1]
        : null;
    const index = localBlockchain.length;
    const timestamp = Date.now();
    const difficulty = 4; // Define the difficulty level

    const { hash, nonce } = proofOfWork(
      index,
      lastBlock?.hash || "0",
      timestamp,
      data,
      difficulty
    );

    const newBlock = {
      index,
      timestamp,
      data,
      prevHash: lastBlock?.hash || "0",
      hash,
      nonce,
    };

    // If there is no previous block, skip the validation for the first block
    if (!lastBlock || isValidNewBlock(newBlock, lastBlock)) {
      localBlockchain.push(newBlock);
      centralServer.emit("newBlock", newBlock);
      io.emit("blockAdded", newBlock); // Emit the new block to all connected clients
      io.emit("blockchain", localBlockchain); // Update blockchain data for all clients
      console.log("New block mined and added to the blockchain", user);
    } else {
      console.log("Invalid block was not added to the chain");
    }
  });
});

server.listen(3002, () => {
  console.log("Miner Server listening on port 3002");
});
