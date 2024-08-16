const crypto = require('crypto');

function createWallet() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

function signTransaction(privateKey, transaction) {
    const signer = crypto.createSign('sha256');
    signer.update(JSON.stringify(transaction));
    signer.end();
    return signer.sign(privateKey, 'hex');
}

function verifyTransaction(publicKey, transaction, signature) {
    const verifier = crypto.createVerify('sha256');
    verifier.update(JSON.stringify(transaction));
    verifier.end();
    return verifier.verify(publicKey, signature, 'hex');
}

module.exports = { createWallet, signTransaction, verifyTransaction };
