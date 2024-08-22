import React from "react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
const socket = io(`${import.meta.env.VITE_SERVER_URL ?? ""}`);

export interface IBlock {
  seq: number;
  nonce: number;
  coinbase: {
    amount: number;
    to: string;
  };
  transactions: ITransaction[]; // Array of transactions
  prev: string; // Hash of the previous block
  timestamp: number;
  hash: string; // Hash of the current block
}

export interface ITransaction {
  amount: number;
  from: string;
  to: string;
  seq: number;
  timestamp: number;
  signature: string;
  pre: number[];
  post: number[];
}

const Blockchain = () => {
  const [blockchains, setBlockchains] = useState<
    {
      id: string;
      publicKey: string;
      blockchain: { chain: IBlock[] };
    }[]
  >([]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log(`connection success`);
    });

    socket.emit("get_on_going_block_chains");

    socket.on("on_going_block_chains", (data) => {
      // Check if the data is in the expected format
      if (Array.isArray(data)) {
        setBlockchains(data);
      } else {
        console.error("Received data is not in the expected format.");
      }
    });

    socket.onAny(() => {
      console.log(`any`);
    });
    // Clean up the socket connection when the component unmounts
    return () => {
      //   socket.off("connect");
      //   socket.off("on_going_block_chains");
    };
  }, []);

  const RenderBlockChain = ({
    blockchain,
    publicKey,
  }: {
    blockchain: IBlock[];
    publicKey: string;
  }) => {
    return (
      <div className="grid">
        <div className="flex space-x-4 overflow-x-scroll py-4">
          {blockchain
            .slice()
            .reverse()
            .map((block, index) => (
              <div
                key={index}
                className={`border rounded-md p-3 bg-muted min-w-[33vh] shrink-0 ${
                  block?.coinbase?.to === publicKey
                    ? "border-green-500"
                    : "border-orange-500"
                }`}
              >
                <div className="space-y-3">
                  <p className="flex items-center gap-2">
                    Block:
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {block.seq}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    Coinbase:
                    <span className="border rounded p-1  block bg-background">
                      {block.coinbase.amount}
                    </span>
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {block.coinbase.to}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    Nonce:
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {block.nonce}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    At:
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {new Date(block.timestamp).toLocaleDateString()}
                    </span>
                  </p>
                  <div>
                    <p>Transactions</p>
                    {block.transactions.map((transaction, index) => (
                      <div className="my-3" key={index}>
                        <p className="flex items-center gap-2">
                          SEQ:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.seq}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          amount:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.amount}
                          </span>
                        </p>{" "}
                        <p className="flex items-center gap-2">
                          From:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.from}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          To:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.to}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          At:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {new Date(
                              transaction.timestamp
                            ).toLocaleDateString()}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          Sender:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.pre[0]}
                          </span>
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.post[0]}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          Receiver:
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.pre[1]}
                          </span>
                          <span className="border rounded p-1 flex-1 block bg-background">
                            {transaction.post[1]}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="flex items-center gap-2">
                    Prev:
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {block.prev}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    Hash:
                    <span className="border rounded p-1 flex-1 block bg-background">
                      {block.hash}
                    </span>
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container md:mt-12 mt-6">
      <h1 className="text-lg font-bold">Live Blockchain</h1>

      <ul className="space-y-3 text-muted-foreground list-disc mt-4 ml-4">
        <li>
          Coinbase part in completely useless till now if 2 miners did something
          at same time then it creates problem
        </li>
        <li>
          <span className="border rounded p-1 border-green-500 text-green-500">
            Green
          </span>{" "}
          border means miner had mined that block first and all blockchain have
          that block
        </li>
        <li>
          <span className="border rounded p-1 border-orange-500 text-orange-500">
            Orange
          </span>{" "}
          border means that miner took this block from another miner because may
          other had done fast or the miner is new.
        </li>
      </ul>
      <div className="grid gap-12 mt-12">
        {blockchains.map((item, index: number) => (
          <div key={index}>
            <h2>
              {item.id}
              <br />
              Block length : {item.blockchain.chain.length}
            </h2>
            {Array.isArray(item.blockchain.chain) ? (
              <RenderBlockChain
                blockchain={item.blockchain.chain}
                publicKey={item.publicKey}
              />
            ) : (
              <p>Error: Blockchain data is not an array.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Blockchain;
