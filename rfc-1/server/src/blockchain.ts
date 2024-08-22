import crypto from "crypto";

export interface ITransaction {
  amount: number;
  from: string;
  to: string;
  seq: number;
  signature: string;
}

export class Transaction implements ITransaction {
  amount: number;
  from: string;
  to: string;
  seq: number;
  signature: string;

  constructor({ amount, from, to, seq, signature }: ITransaction) {
    this.amount = amount;
    this.from = from;
    this.to = to;
    this.seq = seq;
    this.signature = signature;
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
  }
}

export class Blockchain {
  chain: Block[];

  constructor() {
    this.chain = [
      new Block({
        seq: 0,
        coinbase: { amount: 50, to: "genesisMiner" },
        transactions: [],
        prev: "000000000000000000000000000000000",
      }),
    ];
  }
}
