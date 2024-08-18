import express from "express";
import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

const blockchain: any[] = [];

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

io.on("connection", (socket) => {
  console.log("A miner connected");

  // Broadcast blockchain to new miners
  socket.emit("blockchain", blockchain);

  // Listen for new blocks from miners
  socket.on("newBlock", (block) => {
    const lastBlock =
      blockchain.length > 0 ? blockchain[blockchain.length - 1] : null;

    // If there is no previous block, accept the first block as the genesis block
    if (!lastBlock || isValidNewBlock(block, lastBlock)) {
      blockchain.push(block);
      io.emit("blockAdded", block);
      io.emit("blockchain", blockchain);
      console.log("New block added to the blockchain");
      console.log(blockchain);
    } else {
      console.log("Invalid block rejected");
    }
  });
});

server.listen(3001, () => {
  console.log("Central Server listening on port 3001");
});
