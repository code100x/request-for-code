import Transaction from "@repo/types/transaction"
import * as crypto from 'crypto';

class Block {
    timestamp: number;
    transactions: Transaction[];
    previousHash: string;
    hash: string; 
    nonce: number;
    blockIndex: number;

    constructor(transactions: Transaction[],previousHash: string,blockIndex: number, timestamp?: number,nonce?: number) {
        this.timestamp = timestamp ? timestamp : Date.now();
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = nonce ? nonce : 0;
        this.hash = this.calculateHash();
        this.blockIndex = blockIndex;
    }

    calculateHash(): string {
        const data =  this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    mineBlock(difficulty: number): void {
        while(this.hash.substring(0,difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
        console.log('')
    }

    hasValidTransactions(): boolean {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
    
}


export default Block;