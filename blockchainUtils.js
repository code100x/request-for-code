// blockchainUtils.js
const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

function generateBlockHash(block) {
    return crypto.createHash('sha256')
        .update(block.previousHash + JSON.stringify(block.transactions) + block.nonce + block.timestamp + block.index)
        .digest('hex');
}

function publicKeyToAddress(publicKey) {
    const sha256 = crypto.createHash('sha256').update(publicKey, 'hex').digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest('hex');
    return ripemd160;
}

function createTransaction(publicKey, recipient, amount, privateKey) {
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const transaction = {
        publicKey,
        recipient,
        amount,
        timestamp: Date.now(),
    };

    const transactionData = publicKey + recipient + amount + transaction.timestamp;
    const transactionHash = crypto.createHash('sha256').update(transactionData).digest('hex');
    const signature = key.sign(crypto.createHash('sha256').update(transactionData).digest()).toDER('hex');

    transaction.hash = transactionHash;
    transaction.signature = signature;
    return transaction;
}

function validateTransaction(transaction, balances) {
    const { publicKey, recipient, amount, timestamp, signature } = transaction;
    const key = ec.keyFromPublic(publicKey, 'hex');
    const isValid = key.verify(crypto.createHash('sha256').update(publicKey + recipient + amount + timestamp).digest(), signature);

    const senderAddress = publicKeyToAddress(publicKey);
    if (balances[senderAddress] === undefined || balances[senderAddress] < amount) {
        return false;
    }
    return isValid;
}

function validateBlock(block, difficulty) {
    const hash = generateBlockHash(block);
    return hash.substring(0, difficulty) === '0'.repeat(difficulty);
}

module.exports = {
    generateBlockHash,
    publicKeyToAddress,
    createTransaction,
    validateTransaction,
    validateBlock,
};
