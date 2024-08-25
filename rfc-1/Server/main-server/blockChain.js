const crypto = require("crypto");
const { MINING_REWARD } = require("./config");

// Block class represents each block in the blockchain
class Block {
  constructor(index, timestamp, transactions, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  // Calculate the hash of the block based on its properties

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest("hex");
  }
  // Mine the block by finding a hash that matches the difficulty
  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join("0");
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }
}

// Blockchain class represents the entire blockchain
class Blockchain {
  constructor(hasGenesis = true) {
    this.chain = hasGenesis ? [this.createGenesisBlock()] : [];
    this.difficulty = 5;
    this.pendingTransactions = [];
    this.totalTransactions = 0;
    this.transactionPool = [];
    this.transactionsPerBlock = 2;
  }

  // Create the genesis block
  createGenesisBlock() {
    const genBlock = new Block(
      0,
      Date.now(),
      [],
      new Array(64).fill(0).join("")
    );
    console.log(`creating genesis block ${genBlock.hash}`);

    return genBlock;
  }

  // Get the latest block in the blockchain

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getLastNBlocks(n) {
    return this.chain.slice(0 - Number(n));
  }
  // Mine all pending transactions and reward the miner
  minePendingTransactions(miningRewardAddress) {
    if (this.transactionPool.length < this.transactionsPerBlock) {
      console.log("Not enough transactions in the pool to mine a block");
      return null;
    }

    const rewardTx = new Transaction(null, miningRewardAddress, MINING_REWARD);
    const transactionsToMine = this.getTransactionsForNextBlock();
    this.pendingTransactions.push(rewardTx);
    transactionsToMine.push(rewardTx);

    const newBlock = new Block(
      this.chain.length,
      Date.now(),
      transactionsToMine,
      this.getLatestBlock().hash
    );
    newBlock.mineBlock(this.difficulty);

    console.log("Block successfully mined!");
    this.chain.push(newBlock);
    this.totalTransactions += transactionsToMine.length;
    // this.totalTransactions =
    //   this.totalTransactions + this.pendingTransactions.length;

    this.pendingTransactions = [];
    return newBlock;
  }

  // Add a new transaction to the list of pending transactions
  addTransaction(transaction, bypass) {
    console.log("tying to add transaction");

    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error("Transaction must include from and to address");
    }

    if (transaction.amount <= 0) {
      throw new Error("Transaction amount should be higher than 0");
    }

    const senderBalance = bypass
      ? 1000
      : this.getBalanceOfAddress(transaction.fromAddress);
    if (senderBalance < transaction.amount) {
      throw new Error("Not enough balance");
    }

    console.log("adding to transaction pool", transaction.amount);
    this.transactionPool.push(transaction);
    this.pendingTransactions.push(transaction);
    console.log("updated transaction pool ", this.transactionPool);
  }

  getTransactionsForNextBlock() {
    const transactions = this.transactionPool.slice(
      0,
      this.transactionsPerBlock
    );
    this.transactionPool = this.transactionPool.slice(
      this.transactionsPerBlock
    );
    return transactions;
  }

  // Get the balance of a particular address
  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    return balance;
  }

  // Validate the blockchain by checking the hashes

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

  isValidNewBlock(newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) {
      console.log("Invalid indexxxx");
      return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
      console.log(
        `Invalid previous hashhhh ${previousBlock.hash}   --   ${newBlock.previousHash}`
      );
      return false;
    } else if (newBlock.calculateHash() !== newBlock.hash) {
      console.log("Invalid hashhh");
      return false;
    }
    console.log("passed all validations");

    return true;
  }

  addBlock(newBlock) {
    const lBlock = this.getLatestBlock();
    console.log("main server trying to add block", newBlock);

    if (this.isValidNewBlock(newBlock, lBlock)) {
      this.chain.push(newBlock);
      console.log("Block successfully added to the blockchain.");
      return true;
    }
    console.error("Failed to add block: validation failed.");

    return false;
  }

  // Replace the chain with a new one if it's longer and valid
  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      console.log("Received chain is not longer than the current chain.");
      return false;
    } else if (!this.isChainValid(newChain)) {
      console.log("Received chain is invalid.");
      return false;
    }

    console.log("Replacing blockchain with the new chain.");
    this.chain = newChain;
    return true;
  }
}

module.exports = { Blockchain, Block, Transaction };
