// minerServer.js
const WebSocket = require('ws');
const { calculateHash, createBlock, isValidBlock, isValidTransaction } = require('../utils/utils.js');
const { UTXOPool } = require('../utxo/UTXOPool.js');

const port = 3002;
const wss = new WebSocket.Server({ port });

let blockchain = [];
let transactionPool = [];
let utxoPool = new UTXOPool(); // UTXO pool
let difficulty = 4; 

wss.on('connection', ws => {
    console.log('Miner connected');

   
    ws.on('message', message => {
        const data = JSON.parse(message);

        if (data.type === 'newTransaction') {
            handleNewTransaction(data.transaction);
        } else if (data.type === 'newBlock') {
            handleNewBlock(data.block);
        }
    });


    function handleNewTransaction(transaction) {
        if (isValidTransaction(transaction, utxoPool)) {
            transactionPool.push(transaction);
            console.log('Transaction added to pool');
        } else {
            console.log('Invalid transaction');
        }
    }

 
    function handleNewBlock(block) {
        if (isValidBlock(block, blockchain[blockchain.length - 1])) {
            blockchain.push(block);
            updateUTXOPool(block);
            console.log('Block added to blockchain');
        } else {
            console.log('Invalid block');
        }
    }

 
    async function mine() {
        if (transactionPool.length === 0) {
            console.log('No transactions to mine');
            return;
        }

        const lastBlock = blockchain[blockchain.length - 1];
        let nonce = 0;
        let block = createBlock(lastBlock, transactionPool, nonce);

        while (block.hash.substring(0, difficulty) !== '0'.repeat(difficulty)) {
            nonce++;
            block = createBlock(lastBlock, transactionPool, nonce);
        }

        console.log(`Block mined with nonce: ${nonce}`);
        ws.send(JSON.stringify({ type: 'newBlock', block }));
        transactionPool = []; 
    }

    setInterval(mine, 60000);
    
    function updateUTXOPool(block) {
        block.transactions.forEach(tx => {
            
            tx.inputs.forEach(input => {
                utxoPool.removeUTXO(input.txId, input.index);
            });

         
            tx.outputs.forEach((output, index) => {
                utxoPool.addUTXO(tx.txId, index, output.amount, output.address);
            });
        });
    }
});

console.log(`Miner Server listening on port ${port}`);
