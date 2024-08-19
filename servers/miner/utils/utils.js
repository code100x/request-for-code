const crypto = require("crypto");
const { ECPairFactory } = require("ecpair");
const bitcoin = require("bitcoinjs-lib");
const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

function calculateBlockHash(block) {
  const data =
    block.index +
    block.previousHash +
    block.timestamp +
    JSON.stringify(block.transactions) +
    block.nonce;
  return crypto.createHash("sha256").update(data).digest("hex");
}

const isValidProofOfWork = (block, difficulty) => {
  const hash = calculateBlockHash(block);
  return hash.startsWith("0".repeat(difficulty)) && hash === block.hash;
};

const isValidBlockStructure = (block) => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    Array.isArray(block.transactions) &&
    typeof block.nonce === "number"
  );
};

const isValidNewBlock = (newBlock, previousBlock, difficulty) => {
  if (!isValidBlockStructure(newBlock)) {
    console.log("Invalid block structure");
    return false;
  }

  if (!isValidProofOfWork(newBlock, difficulty)) {
    console.log("Invalid proof of work");
    return false;
  }

  if (newBlock.index === 0) {
    return true; // Genesis block is always valid
  }

  if (!previousBlock) {
    console.log("Previous block is undefined");
    return false;
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
};

const isValidChain = (chainToValidate, difficulty) => {
  if (JSON.stringify(chainToValidate[0]) !== JSON.stringify(blockchain[0])) {
    return false;
  }
  for (let i = 1; i < chainToValidate.length; i++) {
    if (
      !isValidNewBlock(chainToValidate[i], chainToValidate[i - 1], difficulty)
    ) {
      return false;
    }
  }
  return true;
};

const isValidTransaction = (transaction, utxoSet) => {
  if (
    !transaction.inputs ||
    !transaction.outputs ||
    !Array.isArray(transaction.inputs) ||
    !Array.isArray(transaction.outputs) ||
    !transaction.signature ||
    !transaction.publicKey
  ) {
    return false;
  }

  // Special case for initial balance transactions
  if (transaction.inputs.length === 0 && transaction.outputs.length === 1) {
    return true;
  }
  // Check if all inputs are unspent
  for (const input of transaction.inputs) {
    const utxoKey = `${input.txid}:${input.vout}`;
    if (!utxoSet.has(utxoKey)) {
      return false;
    }
  }

  try {
    const { signature, publicKey, ...transactionData } = transaction;
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
    return false;
  }

  return true;
};

const keyPair = bip32
  .fromSeed(crypto.randomBytes(32))
  .derivePath("m/44'/0'/0'/0/0");
const { address: minerAddress } = bitcoin.payments.p2pkh({
  pubkey: keyPair.publicKey,
});

module.exports = {
  isValidBlockStructure,
  isValidNewBlock,
  isValidChain,
  isValidTransaction,
  minerAddress,
  calculateBlockHash,
};
