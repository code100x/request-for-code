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
    script: string;
    rawTx: string;
  }
}
