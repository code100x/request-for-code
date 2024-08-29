import Transaction from "@repo/types/transaction"
import Block from "./Block";
import WsHandler from "./WsHandler";

class BlockChain {
    chain: Block[];
    difficulty: number;
    pendingTransactions: Transaction[];
    miningReward: number;

    static instance: BlockChain;

    static getInstance(): BlockChain {
        if (!BlockChain.instance) {
            BlockChain.instance = new BlockChain();
        }
        return BlockChain.instance;
    }

    private constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 3;  // Number of leading zeros required in the hash
        this.pendingTransactions = [];
        this.miningReward = 50;  // Reward for mining a block
    }

    createGenesisBlock(): Block {
        const initialBlock = new Block([],"0",0);
        initialBlock.timestamp = 1609459200000;
        initialBlock.hash = initialBlock.calculateHash();
        return initialBlock;
    }
    
    addTransaction(transaction: Transaction) {
        this.pendingTransactions.push(transaction);
    }
    
    minePendingTransactions(minerAddress: string): void {

        this.pendingTransactions = this.pendingTransactions.filter((txn) => {
            if(!txn.isValid()) {
                console.log("Invalid Transactions", txn.signature);
                return false;
            }
            return true;
        });

        if(this.pendingTransactions.length === 0) {
            console.log("No Transactions to mine !!");
            return;
        }

        const block = new Block(this.pendingTransactions, this.getLatestBlock().hash,this.chain.length);
        block.mineBlock(this.difficulty);

        console.log('Block successfully mined !');
        this.chain.push(block);

        // Update the block to central server, further forwarding to other miners
        WsHandler.getInstance().send(JSON.stringify({
            'type': 'new_block',
            block,
            minerAddress
        }));

        this.pendingTransactions = [];

        //TODO: Reward Transactions for miners 
        // const rewardTxn = new Transaction(null,minerAddress,this.miningReward);

        // this.pendingTransactions = [
        //     rewardTxn
        // ];

        // // This transaction is just present on this miner, so should be send it to other miners too
        
        // WsHandler.getInstance().send(JSON.stringify({
        //     type: 'transaction',
        //     transaction: rewardTxn,
        //     minerAddress
        // }));
        
    }

    getLatestBlock(): Block {
        return this.chain[this.chain.length - 1]!;
    }

    receiveBlock(block: Block): void {
        if (this.validateBlock(block)) {
            if (block.previousHash === this.getLatestBlock().hash) {
                // This block extends our current chain
                this.addBlockToChain(block);
            } else if (this.chain.length >= 2 && block.previousHash === this.chain[this.chain.length - 2]!.hash) {
                // This block is competing with our latest block
                this.handleCompetingBlock(block);
            } else if(this.getLatestBlock().blockIndex < block.blockIndex) {
                // This block is part of a longer chain
                console.log("Received a block which is part of a longer chain");
                this.handleLongerChain(block);
            } else if(this.getLatestBlock().blockIndex > block.blockIndex) {
                // This block is part of a shorter chain}
                console.log("Received a block which is part of a shorter chain !! Ignoring it");
            }
        } else {
            console.error("Invalid block Received %d", block.hash);
        }
    }

    handleCompetingBlock(block: Block) {
        const currentBlock = this.getLatestBlock();
        if(block.timestamp < currentBlock.timestamp || 
        ((block.timestamp == currentBlock.timestamp) && (block.hash < currentBlock.hash)) 
        ) {
            console.log('Updating latest block with competing block' + block.hash);
            this.chain[this.chain.length - 1] = block;

            const exclusiveTransactionsInCurrentBlock = currentBlock.transactions.filter((transaction) => {
                return !block.transactions.some((txn) => txn.calculateHash() === transaction.calculateHash()) 
            })

            // Update the mempool with the exclusive transactions
            this.pendingTransactions = [
                ...this.pendingTransactions,
                ...exclusiveTransactionsInCurrentBlock
            ];
            
            this.updatePendingTransactions(block.transactions);
        }
    }

    handleLongerChain(block: Block) {
        // Need to sync the blockchain and get the longer chain
        const currentBlockIndex = this.getLatestBlock().blockIndex;
        const newBlockIndex = block.blockIndex;

        if (newBlockIndex > currentBlockIndex) {

            const blocksToRequest = (block.blockIndex - this.getLatestBlock().blockIndex) * 2;

            // Request the longer chain from other miners\


            const deregisterHandler = WsHandler.getInstance().registerHandler('sync_chain_response', (data: string) => {
                console.log("Sync Chain Response Received");
                const response = JSON.parse(data);

                const receivedChain = response.chain;
                const syncedBlocks: Block[] = [];;

                for(const block of receivedChain) {
                    const txnArray: Transaction[] = [];
                    if(block.transactions) {
                        for(let i = 0; i < block.transactions.length; i++) {
                            if(block.transactions[i]) {
                                const txn = new Transaction(block.transactions[i].fromAddress,block.transactions[i].toAddress,block.transactions[i].amount,block.transactions[i].signature);
                                txnArray.push(txn);
                            }
                        }
                    }
                    const recvBlock = new Block(txnArray,block.previousHash,block.blockIndex,block.timestamp,block.nonce);
                    syncedBlocks.push(recvBlock);
                }

                
                // const syncedBlocks: Block[] = receivedChainBlocks.map((block: Record<any,any>) => {
                //     const txnArray: Transaction[] = [];
                //     if(block.transactions) {
                //         for(let i = 0; i < block.transactions.length; i++) {
                //             if(block.transactions[i]) {
                //                 const txn = new Transaction(block.transactions[i].fromAddress,block.transactions[i].toAddress,block.transactions[i].amount,block.transactions[i].signature);
                //                 txnArray.push(txn);
                //             }
                //         }
                //     }
                //     const recvBlock = new Block(txnArray,block.previousHash,block.timestamp,block.nonce);
                //     return recvBlock;
                // });

                console.log("Synced Blocks",syncedBlocks);

                if(syncedBlocks.length == 0 ) {
                    console.error("Received an empty chain from other miner");
                    return;
                }

                let divergenceIndex = -1;

                for(let i =  this.chain.length - 1; i >= 0; i--) {
                    if(syncedBlocks.find((blck) => blck.hash === this.chain[i]!.hash)) {
                        divergenceIndex = i;
                        break;
                    }
                }

                if(divergenceIndex == -1) {
                    console.error("Received a chain which is not extending our current chain");
                    // TODO: Request a Full sync for the chain
                    return;
                }


                // Remove the out of sync blocks from our chain
                const removedOutOfSyncBlocks = this.chain.slice(divergenceIndex + 1);

                const removedTransactions = removedOutOfSyncBlocks.flatMap((blck) => blck.transactions);

                this.pendingTransactions = [
                    ...this.pendingTransactions,
                    ...removedTransactions
                ];

                // all the already done transaction which are presenty in the above pending transactions will be 
                // removed when we finaly add the synced blocks to our chain

                const blocksToAdd = syncedBlocks.slice(syncedBlocks.indexOf(syncedBlocks.find(b => b.hash === this.getLatestBlock().hash)!) + 1);

                for(const block of blocksToAdd) {
                    if(this.validateBlock(block) && block.previousHash === this.getLatestBlock().hash) {
                        this.addBlockToChain(block);
                        this.updatePendingTransactions(block.transactions);
                    } else {
                        console.error("Invalid block received from other miner");
                        break;
                    }
                }

                console.log("Chain synced successfully");

                // One time callback, hence deregister after complete 
                deregisterHandler();
            });

            WsHandler.getInstance().send(JSON.stringify({
                type: 'sync_chain',
                blockIndex: Math.max(0, block.blockIndex - blocksToRequest),
            }));



        } else {
            console.log("Received a block which is part of a shorter chain !! Ignoring it");
        }
    }

     addBlockToChain(block: Block): void {
        this.chain.push(block);
        console.log(`Added new block to chain: ${block.hash}`);
        
        // Remove transactions in this block from pending transactions
        this.updatePendingTransactions(block.transactions);
    }
    

    validateBlock(block: Block) {
        // if(block.previousHash !== this.getLatestBlock().hash) {
        //     console.error("Invalid previous hash");
        //     return false;
        // }
        if(!block.hasValidTransactions()) {
            console.error("Invalid transactions in block");
            return false;
        }
        if(block.hash !== block.calculateHash()) {
            console.error("Invalid hash");
            return false;
        }
        return true;
    }
    
    addBlock(newBlock: Block) {
        this.chain.push(newBlock);
    }

    updatePendingTransactions(confirmedTransactions: Transaction[]) {
        this.pendingTransactions = this.pendingTransactions.filter((transaction) => {
            return !confirmedTransactions.some((txn) => txn.calculateHash() === transaction.calculateHash());
        });
    }

}

export default BlockChain;