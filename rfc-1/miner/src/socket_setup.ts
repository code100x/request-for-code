import { Socket } from "socket.io-client";
import { Block, Blockchain } from "./blockchain.js";
import { sendUpdateBlockChainToServer } from "./index.js";

export function initializeSocket(blockchain: Blockchain, socket: Socket) {
  // Send blockchain to other miners
  socket.on("requestBlockchain", () => {
    socket.emit("blockchain", blockchain);
  });

  //  function to receiver online blockchain then accept if valid and long then its own
  socket.on("blockchain", ({ chain }: { chain: Block[] }) => {
    if (chain.length > blockchain.chain.length) {
      const tempBlockchain = new Blockchain();
      for (let block of chain) {
        const newBlock = new Block(block);
        tempBlockchain.validateAndAddBlock(newBlock, false);
      }
      blockchain.chain = tempBlockchain.chain;
      sendUpdateBlockChainToServer(blockchain);
    }
  });

  //   proccess the transaction from center server
  socket.on("transaction", (data) => {
    blockchain.addTransaction(data);
  });

  // proccess the new block from the center server given my other minerss
  socket.on("newBlock", (data) => {
    blockchain.validateAndAddBlock(data);
  });

  return socket;
}
