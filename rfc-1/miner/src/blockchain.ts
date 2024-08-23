import crypto from "crypto";
import {
  broadCastBlock,
  getMeBlockchain,
  MY_ACCOUNT,
  sendUpdateBlockChainToServer,
} from "./index.js";
import { Mutex } from "async-mutex";
import nacl from "tweetnacl";
import pkg from "tweetnacl-util";
const { decodeUTF8 } = pkg;
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";

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

export class Transaction implements ITransaction {
  amount: number;
  from: string;
  to: string;
  seq: number;
  signature: string;
  timestamp: number;
  pre: number[];
  post: number[];
  constructor({
    amount,
    from,
    to,
    seq,
    signature,
    timestamp,
    pre,
    post,
  }: ITransaction) {
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.seq = seq;
    this.signature = signature;
    this.timestamp = timestamp;
    this.pre = pre;
    this.post = post;
  }
}

export class Block {
  seq: number;
  nonce: number;
  coinbase: {
    amount: number;
    to: string;
  };
  transactions: Transaction[]; // Fixed type from Block[] to Transaction[]
  prev: string;
  hash: string;
  timestamp: number;

  constructor({
    seq,
    coinbase,
    transactions,
    prev,
    hash = "",
    nonce = 0,
  }: {
    seq: number;
    coinbase: { amount: number; to: string };
    transactions: Transaction[];
    prev: string;
    hash?: string;
    nonce?: number;
  }) {
    this.seq = seq;
    this.nonce = nonce;
    this.coinbase = coinbase;
    this.transactions = transactions;
    this.prev = prev;
    this.hash = hash;
    this.timestamp = Date.now();
  }

  addTransaction(transaction: Transaction) {
    const newTransaction = new Transaction(transaction);
    newTransaction.timestamp = Date.now();
    this.transactions.push(newTransaction);
  }

  calculateHash(): string {
    const blockData = JSON.stringify(this);
    return crypto.createHash("sha256").update(blockData).digest("hex");
  }

  async mineBlock() {
    const target = "0000";
    const delay = Math.random() * 2;
    // just a normal delay to put any miner behind
    await new Promise<void>((res) => {
      setTimeout(() => {
        res();
      }, delay * 1000);
    });
    while (this.hash.substring(0, 4) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
  validateHash() {
    const blockData = `${this.seq}${this.nonce}${JSON.stringify(
      this.coinbase
    )}${JSON.stringify(this.transactions)}${this.prev}`;
    const calculatedHash = crypto
      .createHash("sha256")
      .update(blockData)
      .digest("hex");
    return this.hash === calculatedHash;
  }
}

export class Blockchain {
  chain: Block[];
  private mutex: Mutex = new Mutex();
  constructor(initialChainData = []) {
    this.chain = [
      new Block({
        seq: 0,
        coinbase: { amount: 10, to: MY_ACCOUNT.publicKey },
        transactions: [],
        prev: "0000000000000000000000000000000000000000", // Ensure the previous hash is of correct length
      }),
    ];
  }

  async addTransaction(transaction: Transaction) {
    const latestBlock = this.getLatestBlock();
    const validatedTransaction = this.validateTransaction(transaction);
    if (!validatedTransaction) return;

    // Check if the block can accept more transactions
    if (latestBlock.transactions.length < 2) {
      latestBlock.addTransaction(validatedTransaction);
      sendUpdateBlockChainToServer(this);
    }

    // Mine the block if it has reached the transaction limit
    if (latestBlock.transactions.length === 2) {
      await latestBlock.mineBlock();
      await this.addBlock(
        new Block({
          seq: latestBlock.seq + 1,
          coinbase: { amount: 10, to: MY_ACCOUNT.publicKey },
          transactions: [],
          prev: latestBlock.hash,
        })
      );
    }
  }
  async addBlock(newBlock: Block) {
    const latestBlock = this.getLatestBlock();
    if (latestBlock.hash && latestBlock.transactions.length === 2) {
      await this.putBlockToChain(newBlock, true);
    }
  }

  async putBlockToChain(
    block: Block,
    broadcast: boolean = false,
    requestAllowed = true
  ) {
    const latestBlock = this.getLatestBlock();
    // If the latest block's hash matches the new block's previous hash

    if (latestBlock.hash === block.prev) {
      block.seq = latestBlock.seq + 1;
      this.chain.push(block);
      if (broadcast) {
        broadCastBlock(latestBlock);
      }
    } else if (latestBlock.seq === block.seq && !latestBlock.hash) {
      this.chain[latestBlock.seq] = block;
      if (block.transactions.length === 2) {
        this.chain.push(
          new Block({
            seq: block.seq + 1,
            coinbase: { amount: 10, to: MY_ACCOUNT.publicKey },
            transactions: [],
            prev: block.hash,
          })
        );
      }
    } else if (latestBlock.seq < block.seq) {
      if (requestAllowed) {
        getMeBlockchain();
      } else {
      }
    }
    sendUpdateBlockChainToServer(this);
  }

  // Validate and add a block from the network
  async validateAndAddBlock(data: Block, requestAllowed = true) {
    const newBlock = new Block(data);
    await this.putBlockToChain(newBlock, false, requestAllowed);
  }
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }
  validateTransaction(userTransaction: Transaction): Transaction | null {
    try {
      const blocks = [...this.chain];
      blocks.reverse();
      const isCorrectSignature = nacl.sign.detached.verify(
        decodeUTF8(
          JSON.stringify({
            amount: userTransaction.amount,
            from: userTransaction.from,
            to: userTransaction.to,
            timestamp: userTransaction.timestamp,
          })
        ),
        bs58.decode(userTransaction.signature),
        new PublicKey(userTransaction.from).toBytes()
      );
      if (userTransaction.from === userTransaction.to) return null;
      if (!isCorrectSignature) null;
      if (blocks.length === 1 && blocks[0].transactions.length === 0) {
        userTransaction.seq = 1;
        userTransaction.pre = [1000_000_000, 0];
        userTransaction.post = [1000_000_000 - 100, 100];
        return userTransaction;
      }
      let sendPreBalance: null | number = null;
      let reciverPreBalance: null | number = null;
      let seq: null | number = null;
      for (const block of blocks) {
        const transactions = [...block.transactions];
        transactions.reverse();
        for (const transaction of transactions) {
          if (!seq) {
            seq = transaction.seq;
          }
          if (!sendPreBalance) {
            if (transaction.to === userTransaction.from) {
              sendPreBalance = transaction.post[1];
            } else if (transaction.from === userTransaction.from) {
              sendPreBalance = transaction.post[0];
            }
          } else {
          }
          if (!reciverPreBalance) {
            if (transaction.to === userTransaction.to) {
              reciverPreBalance = transaction.post[1];
            } else if (transaction.from === userTransaction.to) {
              reciverPreBalance = transaction.post[0];
            }
          } else {
          }
          if (sendPreBalance && reciverPreBalance) {
            break;
          }
        }
        if (sendPreBalance && reciverPreBalance) {
          break;
        }
      }

      if (!seq) return null;
      if (sendPreBalance && sendPreBalance > userTransaction.amount) {
        userTransaction.pre = [sendPreBalance, reciverPreBalance || 0];
        userTransaction.seq = seq;

        userTransaction.post = [
          sendPreBalance - userTransaction.amount,
          (reciverPreBalance || 0) + userTransaction.amount,
        ];
        return userTransaction;
      } else {
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  getBalance(publicKey: string): number {
    try {
      let balance: null | number = null;
      const blocks = [...this.chain];
      blocks.reverse();
      for (const block of blocks) {
        const transactions = [...block.transactions].reverse();
        for (const transaction of transactions) {
          if (balance) break;
          if (transaction.to === publicKey) {
            balance = transaction.post[1];
          } else if (transaction.from === publicKey) {
            balance = transaction.post[0];
          }
        }
      }
      if (balance) {
        return balance;
      } else return 0;
    } catch (e) {
      return 0;
    }
  }

  getTransactionBySignature(signature: string): null | Transaction {
    try {
      const blocks = [...this.chain];
      blocks.reverse();
      for (const block of blocks) {
        for (const transaction of block.transactions) {
          if (transaction.signature === signature) {
            return transaction;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  getUserTransaction(publicKey: string): Transaction[] {
    try {
      const userTransactions: Transaction[] = [];
      const blocks = [...this.chain];
      blocks.reverse();
      for (const block of blocks) {
        const transactions = [...block.transactions].reverse();
        for (const transaction of transactions) {
          if (transaction.from === publicKey || transaction.to === publicKey) {
            userTransactions.push(transaction);
          }
        }
      }
      return userTransactions;
    } catch (e) {
      return [];
    }
  }
}
