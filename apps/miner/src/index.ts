import Blockchain from './BlockChain';
import Transaction from '@repo/types/transaction';
import * as crypto from 'crypto';
import WsHandler from './WsHandler';

// Generate key pairs for Miner
export const { publicKey: minerPublicKey, privateKey: minerPrivateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
});

// Create a new blockchain instance
const myBlockchain = Blockchain.getInstance();

console.log(JSON.stringify(myBlockchain, null, 2));

// Create a new WebSocket instance
const webSocketHandler = WsHandler.getInstance();

if(!webSocketHandler) {
    throw new Error("Can't connect to central server");
}

setInterval(() => {
    // Mine pending transactions
    myBlockchain.minePendingTransactions(minerPublicKey.export({ type: 'pkcs1', format: 'pem' }).toString());
},1000);


setInterval(() => {
    console.log('\nCurrent Blockchain Status:');
    console.log(getBlockchainStatus());
}, 60000);  // Log every 60 seconds

function getBlockchainStatus() {
    return JSON.stringify(myBlockchain, null, 2);
}