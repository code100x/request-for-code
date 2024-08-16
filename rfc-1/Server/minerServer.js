const WebSocket = require('ws');
const { Blockchain, Block } = require('./block');
const { proofOfWork } = require('./utils');

const ws = new WebSocket('ws://localhost:8080');
const blockchain = new Blockchain();


function mineBlock() {
    const lastBlock = blockchain.getLatestBlock();
    const newBlock = new Block(
        lastBlock.index + 1,
        lastBlock.hash,
        Date.now(),
        [],  
        0,   
        null 
    );

    proofOfWork(newBlock);

    console.log('New block mined:', newBlock);

    
    ws.send(JSON.stringify(newBlock));
}


ws.on('open', () => {
    console.log('Connected to central server, starting mining...');
    mineBlock();
});


ws.on('message', (message) => {
    const newBlock = JSON.parse(message);
    console.log('Received new block from central server:', newBlock);

    
    if (blockchain.addBlock(newBlock)) {
        console.log('New block added to the chain');
    } else {
        console.log('Received block is invalid');
    }
});


ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});


ws.on('close', () => {
    console.log('Disconnected from central server');
});
