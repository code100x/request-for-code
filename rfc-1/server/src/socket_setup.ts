import { Server } from "socket.io";
import { IOnGoingBlockChains } from "./index.js";
import { Blockchain } from "./blockchain.js";

export function initializeSocket(
  io: Server,
  onGoingBlockChains: IOnGoingBlockChains[]
) {
  io.on("connection", (socket) => {
    socket.on("requestBlockchain", () => {
      // socket.broadcast.to("miners").emit("requestBlockchain");
      io.to("miners").emit("requestBlockchain");
    });

    socket.on("blockchain", (data) => {
      // i have the blockchain data let me send it to you
      io.to("miners").emit("blockchain", data);
      // socket.broadcast.to("miners").emit("blockchain", data);
    });
    socket.on("join_miners", () => {
      console.log(`miner is their`);
      socket.join("miners");
    });

    socket.on("newBlock", (data) => {
      socket.broadcast.to("miners").emit("newBlock", data);
    });

    socket.on("transaction", (data) => {
      socket.broadcast.to("miners").emit("transaction", data);
    });
    const sendLatestBlockchain = () => {
      io.emit("on_going_block_chains", onGoingBlockChains);
    };
    socket.on(
      "myblockchain",
      ({ id, blockchain, publicKey, url }: IOnGoingBlockChains) => {
        const index = onGoingBlockChains.findIndex((item) => item.id === id);
        if (index !== -1) {
          onGoingBlockChains[index] = {
            id,
            publicKey,
            blockchain,
            url,
          };
        } else {
          onGoingBlockChains.push({ id, publicKey, blockchain, url });
        }
        sendLatestBlockchain();
      }
    );

    socket.on("get_on_going_block_chains", () => {
      socket.emit("on_going_block_chains", onGoingBlockChains);
    });

    socket.on("disconnect", () => {
      const minerID = `${socket.id}`;

      // Find the index of the blockchain with the matching minerID
      const index = onGoingBlockChains.findIndex((item) => item.id === minerID);

      // If found, remove it from the array
      if (index !== -1) {
        onGoingBlockChains.splice(index, 1);
      }

      sendLatestBlockchain();
    });
  });
}
