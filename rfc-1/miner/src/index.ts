import { Block, Blockchain } from "./blockchain.js";
import express from "express";
import cors from "cors";
const app = express();
import { createAccountFunction } from "./lib/utils.js";
import { initializeSocket } from "./socket_setup.js";
import routes from "./routes/index.js";
import { io } from "socket.io-client";
import dotenv from "dotenv";
// details of the miner account where after moeny will deposited
dotenv.config();
export const MY_ACCOUNT = createAccountFunction();
export const blockchain = new Blockchain();
const socketConnection = io(process.env.SERVER_URL ?? "");
export let MY_ID = "";

// basic socket connection to get out MY_ID
socketConnection.on("connect", () => {
  MY_ID = socketConnection.id ? socketConnection.id : "";
  socketConnection.emit("join_miners");
  socketConnection.emit("requestBlockchain");
  sendUpdateBlockChainToServer(blockchain);
});
const socket = initializeSocket(blockchain, socketConnection);

// Request blockchain data
export function getMeBlockchain() {
  console.log(`Requested new blockchain`);
  socket.emit("requestBlockchain");
}

export function sendUpdateBlockChainToServer(blockchain: Blockchain) {
  console.log(MY_ID, `MY_ID is here`);
  socket.emit("myblockchain", {
    id: MY_ID,
    publicKey: MY_ACCOUNT.publicKey,
    url: `${process.env.URL}`,
    blockchain,
  });
}

// Broadcast a new block to other miners
export const broadCastBlock = (block: Block) => {
  console.log(block.seq, `thisis bordcaseted`);
  socket.emit("newBlock", block);
};

app.use(express.json());
app.use(cors());
app.use("/", routes);

app.listen(process.env.PORT, () => {});
