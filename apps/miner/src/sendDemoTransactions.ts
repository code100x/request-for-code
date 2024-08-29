import WebSocket from 'ws';
import Transaction from '@repo/types/transaction';
import * as crypto from 'crypto';


// Create a WebSocket connection to the server
const ws = new WebSocket('ws://localhost:8080?publicKey="jasn');

// Event handler for when the connection is established
ws.on('open', () => {

    const senderKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });

    const receiverKeyPair = crypto.generateKeyPairSync('rsa',{
        modulusLength: 2048,
    })

    // Create a demo transaction object
    const transaction = new Transaction(
        senderKeyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        receiverKeyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        10
    );

    transaction.signTransaction(senderKeyPair.privateKey);

    // Send the transaction to the server
    ws.send(JSON.stringify({
        type: 'transaction',
        transaction
    })); 
});
