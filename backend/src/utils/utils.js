const crypto = require('crypto');


function calculateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createBlock(previousBlock, transactions, nonce) {
  const { index, timestamp, previousHash } = previousBlock;
  const blockData = {
    index: index + 1,
    timestamp,
    transactions,
    previousHash,
    nonce
  };
  return {
    ...blockData,
    hash: calculateHash(JSON.stringify(blockData))
  };
}

function isValidNewBlock(newBlock, previousBlock) {
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("Invalid index");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log(`Invalid previous hash: ${previousBlock.hash} !== ${newBlock.previousHash}`);
    return false;
  } else if (calculateHash(JSON.stringify(newBlock)) !== newBlock.hash) {
    console.log("Invalid hash");
    return false;
  }
  console.log("Passed all validations");
  return true;
}


function isValidTransaction(transaction, utxoPool) {
  const { inputs, outputs } = transaction;
  
  for (const input of inputs) {
    const utxo = utxoPool[input.txId + ':' + input.index];
    if (!utxo || utxo.amount < input.amount + input.fee) {
      return false;
    }
  }
  
  for (const output of outputs) {
    if (output.amount <= 0) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  calculateHash,
  createBlock,
  isValidTransaction,
  isValidNewBlock
};
