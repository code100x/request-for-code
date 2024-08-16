const crypto = require('crypto');

function proofOfWork(block) {
    let hash;
    let nonce = 0;

    do {
        nonce++;
        hash = calculateHash(block.index, block.previousHash, block.timestamp, block.transactions, nonce);
    } while (!hash.startsWith('0000'));

    block.nonce = nonce;
    block.hash = hash;

    return hash;
}

function calculateHash(index, previousHash, timestamp, transactions, nonce) {
    return crypto.createHash('sha256').update(index + previousHash + timestamp + JSON.stringify(transactions) + nonce).digest('hex');
}

module.exports = { proofOfWork, calculateHash };
