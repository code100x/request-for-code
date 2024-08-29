let bs58 = require('bs58')
import WebSocket from 'ws';
import BlockChain from './BlockChain';
import Transaction from '@repo/types/transaction';
import Block from './Block';
import {minerPublicKey} from './index'

class WsHandler {
    
    private socket: WebSocket;
    private registerdCallBacks: Map<string,((data: string)=>void)[]>;

    // private static URL = "ws://localhost:8080" + "?publicKey=" + bs58.encode(Buffer.from(minerPublicKey.export({ type: 'pkcs1', format: 'pem' }).toString()));

    private static instance: WsHandler | null = null;

    static getInstance(): WsHandler {
        if (!WsHandler.instance) {
            let URL = "ws://localhost:8080" + "?publicKey=" + bs58.default.encode(Buffer.from(minerPublicKey.export({ type: 'pkcs1', format: 'pem' }).toString()));
            WsHandler.instance = new WsHandler(URL);
        }
        return WsHandler.instance;
    }

    private constructor(url: string) {
        this.socket = new WebSocket(url);

        this.registerdCallBacks = new Map();

        this.socket.on('open', () => {
            console.log('Connected to websocket server');
        });

        this.socket.on('message', (data) => {
            console.log('Received message:', data);
            // Handle the received message here
            this.handleIncomingMessage(data.toString());
        });

        this.socket.on('close', () => {
            console.log('Disconnected from websocket server');
        });

        this.socket.on('error', (error) => {
            console.error('Websocket error:', error);
        });
    }

    // Add your custom handlers here

    private handleIncomingMessage = (message: string) => {

        const data = JSON.parse(message);
    
        switch (data.type) {
            case 'new_block':
                // Broadcast the new block to all miners
                const block = data.block;
                console.log('Received new block');
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
                BlockChain.getInstance().receiveBlock(recvBlock);
                break;
    
            case 'transaction':
                // Broadcast the transaction to all miners
                console.log('Received new transaction.');
                const transaction = data.transaction;
                const txn = new Transaction(transaction.fromAddress,transaction.toAddress,transaction.amount,transaction.signature);
                console.log(transaction);
                if(!txn.isValid()) {
                    console.error('Invalid Transaction !! Rejected ❌');
                } else {
                    console.log('Transaction Queued ⏱️');
                    BlockChain.getInstance().addTransaction(txn);
                }
                break;
            
            case 'latest_block_hash':
                console.log("Requested the latest block hash");
                const blockHash = BlockChain.getInstance().getLatestBlock().hash;
                this.socket.send(JSON.stringify({
                    blockHash
                }));
                break;
            
            case 'sync_chain':
                console.log("Sync Chain Request Received");
                try {
                    const blockIndex = data.blockIndex;
                    const requestedChain = BlockChain.getInstance().chain.slice(blockIndex);
                    this.socket.send(JSON.stringify({
                        type: 'sync_chain_response',
                        chain: requestedChain
                    }));
                } catch (error) {
                    console.log("Error in Sync Chain Request Received");
                    this.socket.send(JSON.stringify({
                        type: 'sync_chain_response',
                        error: "Invalid Block Index"
                    }));
                }
                break;
            
            case 'sync_chain_response': 
                console.log("Synced Chain Received",this.registerdCallBacks.get('sync_chain_response'));
                this.registerdCallBacks.get('sync_chain_response')?.map(cb => cb(message));
                break;

    
            case 'request_missing_blocks':
                // Handle the request for missing blocks
                break;
    
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    registerHandler(event: string, callBack: ((data: string) => void)) {
        let callBacks = this.registerdCallBacks.get(event);
        if(!callBacks) {
            callBacks = [];
        }
        callBacks.push(callBack);
        this.registerdCallBacks.set(event,callBacks);
        return () => {
            let callBacks = this.registerdCallBacks.get(event);
            if(!callBacks) {
                callBacks = [];
            }
            this.registerdCallBacks.set(event,callBacks.filter(cb => cb !== callBack));
        }
    }
    
    send(message: string) {
        this.socket.send(message);
    }

    close() {
        this.socket.close();
    }
}



export default WsHandler;