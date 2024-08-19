const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const { ECPairFactory } = require("ecpair");

const ECPair = ECPairFactory(ecc);

const network = bitcoin.networks.testnet;

const { CENTRAL_CONFIG } = require("./constant");

function calculateBlockHash(block) {
  const data =
    block.index +
    block.previousHash +
    block.timestamp +
    JSON.stringify(block.transactions) +
    block.nonce;
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isValidProofOfWork(block) {
  const hash = calculateBlockHash(block);
  return (
    hash.startsWith("0".repeat(CENTRAL_CONFIG.DIFFICULTY)) &&
    hash === block.hash
  );
}

function isValidBlockStructure(block) {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    Array.isArray(block.transactions) &&
    typeof block.nonce === "number"
  );
}

function isValidNewBlock(newBlock, previousBlock) {
  if (!isValidBlockStructure(newBlock)) {
    console.log("Invalid block structure");
    return false;
  }
  if (!isValidProofOfWork(newBlock)) {
    console.log("Invalid proof of work");
    return false;
  }

  if (newBlock.index === 0) {
    return true; // Genesis block is always valid
  }

  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("Invalid index");
    return false;
  }
  if (previousBlock.hash !== newBlock.previousHash) {
    console.log("Invalid previous hash");
    return false;
  }

  return true;
}

function isValidAddress(address) {
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch (e) {
    console.log("Invalid address error:", e);
    return false;
  }
}

function isValidTransaction(transaction, utxoSet) {
  if (!transaction) {
    console.log("No transaction data");
    return false;
  }

  if (
    !transaction.inputs ||
    !transaction.outputs ||
    !Array.isArray(transaction.inputs) ||
    !Array.isArray(transaction.outputs)
  ) {
    console.log("Invalid transaction structure 0");
    return false;
  }

  // Check if all inputs are unspent
  for (const input of transaction.inputs) {
    const utxoKey = `${input.txid}:${input.vout}`;
    if (!utxoSet.has(utxoKey)) {
      return false;
    }
  }

  try {
    const { signature, publicKey, id, ...transactionData } = transaction;
    const transactionBuffer = Buffer.from(JSON.stringify(transactionData));
    const sigHash = bitcoin.crypto.hash256(transactionBuffer);

    const signatureBuffer = Buffer.from(signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");

    const pubKeyPair = ECPair.fromPublicKey(publicKeyBuffer);

    if (!pubKeyPair.verify(sigHash, signatureBuffer)) {
      console.log("Invalid signature");
      return false;
    }
  } catch (e) {
    console.log("Error verifying signature:", e);
    return false;
  }

  // Check if total input amount is greater than or equal to total output amount
  const totalInput = transaction.inputs.reduce((sum, input) => {
    const utxo = utxoSet.get(`${input.txid}:${input.vout}`);
    return sum + utxo.amount;
  }, 0);

  const totalOutput = transaction.outputs.reduce(
    (sum, output) => sum + output.amount,
    0
  );

  if (totalInput < totalOutput) {
    console.log("Invalid transaction amount");
    return false;
  }

  // Check if all output addresses are valid
  for (const output of transaction.outputs) {
    if (!isValidAddress(output.address)) {
      console.log("Invalid output address");
      return false;
    }
  }

  return true;
}

module.exports = {
  isValidProofOfWork,
  isValidBlockStructure,
  isValidNewBlock,
  isValidAddress,
  isValidTransaction,
};
