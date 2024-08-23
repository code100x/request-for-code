class UTXO {
    constructor(txId, index, amount, address) {
      this.txId = txId;
      this.index = index;
      this.amount = amount;
      this.address = address;
    }
  }
  
  class UTXOPool {
    constructor() {
      this.utxos = {}; 
    }
  
    // Add UTXO to the pool
    addUTXO(txId, index, amount, address) {
      const key = `${txId}:${index}`;
      this.utxos[key] = new UTXO(txId, index, amount, address);
    }
  
    // Remove UTXO from the pool
    removeUTXO(txId, index) {
      const key = `${txId}:${index}`;
      if (this.utxos[key]) {
        delete this.utxos[key];
      }
    }
  
    
    findUTXO(txId, index) {
      const key = `${txId}:${index}`;
      return this.utxos[key];
    }
  

    initializeFromBlockchain(blockchain) {
      this.utxos = {};
      for (const block of blockchain) {
        for (const transaction of block.transactions) {
          transaction.outputs.forEach((output, index) => {
            this.addUTXO(transaction.txId, index, output.amount, output.address);
          });
        }
      }
    }
  }
  
  module.exports = {
    UTXO,
    UTXOPool
  };
  