import crypto from 'crypto';

function proofOfWork(block, difficulty) {
    const target = '0'.repeat(difficulty);  // The target string we're aiming for
    let hash;
    
    // console.log(`Starting Proof of Work. Target: ${target}`);

    while (true) {
        hash = calculateHash(block.index, block.previousHash, block.timestamp, block.transactions, block.nonce);
        
        if (hash.startsWith(target)) {
            block.hash = hash;  // Valid hash found, save it in the block
            // console.log(`Proof of Work completed. Hash: ${hash}, Nonce: ${block.nonce}`);
            break;  // Exit the loop
        }

        block.nonce++;  // Increment the nonce for the next iteration
        
        // Log the nonce and hash for debugging purposes
        // if (block.nonce % 10000 === 0) {  // Log every 10,000 iterations
        //     console.log(`Current nonce: ${block.nonce}, Hash: ${hash}`);
        // }
    }
}

function calculateHash(index, previousHash, timestamp, transactions, nonce) {
    return crypto
        .createHash('sha256')
        .update(index + previousHash + timestamp + JSON.stringify(transactions) + nonce)
        .digest('hex');
}

export default proofOfWork;
