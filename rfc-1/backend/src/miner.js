const crypto = require("crypto");
const WebSocket = require("ws");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

class Block {
  constructor(previousHash, transactions, timestamp = Date.now()) {
    this.previousHash = previousHash;
    this.transactions = transactions;
    this.timestamp = timestamp;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.previousHash +
          JSON.stringify(this.transactions) +
          this.timestamp +
          this.nonce
      )
      .digest("hex");
  }

  mineBlock(difficulty) {
    while (!this.hash.startsWith("0".repeat(difficulty))) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log("Block mined: " + this.hash);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = 100;
  }

  createGenesisBlock() {
    return new Block("0", [], Date.now());
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }
  getLastBlock() {
    return this.chain[this.chain.length - 2];
  }

  minePendingTransactions(miningRewardAddress) {
    const rewardTx = {
      from: null,
      to: miningRewardAddress,
      amount: this.miningReward,
    };
    this.pendingTransactions.push(rewardTx);

    let block = new Block(this.getLatestBlock().hash, this.pendingTransactions);
    block.mineBlock(this.difficulty);

    console.log("Block successfully mined!");
    this.chain.push(block);

    this.pendingTransactions = [];
  }

  addTransaction(transaction) {
    if (!transaction.from || !transaction.to) {
      throw new Error("Transaction must include from and to address");
    }

    if (!this.validateTransaction(transaction)) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    this.pendingTransactions.push(transaction);
  }

  validateTransaction(transaction) {
    if (transaction.from === null) return true; // Mining reward

    const fromBalance = this.getBalanceOfAddress(transaction.from);
    if (fromBalance < transaction.amount) {
      console.log("Not enough balance");
      return false;
    }

    const key = ec.keyFromPublic(transaction.from, "hex");
    const validSignature = key.verify(
      this.calculateTransactionHash(transaction),
      transaction.signature
    );

    if (!validSignature) {
      console.log("Invalid signature");
      return false;
    }

    return true;
  }

  calculateTransactionHash(transaction) {
    return crypto
      .createHash("sha256")
      .update(transaction.from + transaction.to + transaction.amount)
      .digest("hex");
  }

  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.from === address) {
          balance -= trans.amount;
        }
        if (trans.to === address) {
          balance += trans.amount;
        }
      }
    }
    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

const ws = new WebSocket("ws://localhost:8080");

const myBlockchain = new Blockchain();

ws.on("open", () => {
  console.log("Connected to central server");

  // Request the current blockchain from other miners
  ws.send(JSON.stringify({ type: "GET_BLOCKCHAIN" }));
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data);

    if (message.type === "NEW_BLOCK") {
      const newBlock = new Block(
        myBlockchain.getLastBlock().hash,
        message.data.transactions,
        message.data.timestamp
      );
      newBlock.hash = message.data.hash;
      newBlock.nonce = message.data.nonce;

      if (
        newBlock.hash === newBlock.calculateHash() &&
        newBlock.previousHash === myBlockchain.getLatestBlock().hash &&
        myBlockchain.isChainValid()
      ) {
        myBlockchain.chain.push(newBlock);
        console.log("New block added to the chain");
        ws.send(
          JSON.stringify({
            type: "BLOCK_ADDED",
            data: { blockHash: newBlock.hash },
          })
        );
      } else {
        console.log("Invalid block received");
        ws.send(
          JSON.stringify({
            type: "INVALID_BLOCK",
            data: { blockHash: newBlock.hash },
          })
        );
      }
    } else if (message.type === "NEW_TRANSACTION") {
      try {
        myBlockchain.addTransaction(message.data);
        ws.send(
          JSON.stringify({
            type: "TRANSACTION_ADDED",
            data: {
              from: message.data.from,
              to: message.data.to,
              amount: message.data.amount,
            },
          })
        );
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "INVALID_TRANSACTION",
            data: {
              error: error.message,
              transaction: message.data,
            },
          })
        );
      }
    } else if (message.type === "GET_BLOCKCHAIN") {
      ws.send(
        JSON.stringify({
          type: "BLOCKCHAIN",
          data: myBlockchain.chain,
        })
      );
    } else if (message.type === "BLOCKCHAIN") {
      if (
        message.data.length > myBlockchain.chain.length &&
        new Blockchain().isChainValid(message.data)
      ) {
        myBlockchain.chain = message.data;
        console.log("Updated blockchain from network");
      }
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

setInterval(() => {
  myBlockchain.minePendingTransactions("miner-address");
  ws.send(
    JSON.stringify({
      type: "NEW_BLOCK",
      latestBlock: myBlockchain.getLatestBlock(),
    })
  );
}, 10000);
