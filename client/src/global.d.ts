export declare global {
  interface IWallet {
    mnemonic: string;
    publicKey: string;
    privateKey: string;
  }

  interface ITransaction {
    from: string;
    to: string;
    amount: number;
    timestamp: number;
  }

  interface IUTXO {
    txid: string;
    vout: number;
    address: string;
    amount: number;
  }

  interface ITx {
    id: string;
    inputs: IUTXO[];
    outputs: {
      address: string;
      amount: number;
    }[];
    publicKey: string;
    signature: string;
    timestamp: number;
  }
  interface IBlock {
    hash: string;
    index: number;
    nonce: number;
    previousHash: string;
    timestamp: number;
    transactions: ITx[];
  }
}
