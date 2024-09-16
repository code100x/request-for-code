import * as crypto from 'crypto';
import * as WebSocket from 'ws';
import {ec} from 'elliptic';

const EC = new ec('secp256k1');

class Block{
  public hash: string;
  public nonce: number = 0;

  constructor(
    public index:number,
    public timestamp: number,
    public transactions: Transaction[],
    public prevHash: string = ''
  ){
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    return crypto.createHash('sha256').update(
      this.index +
      this.prevHash +
      this.timestamp +
      JSON.stringify(this.transactions) +
      this.nonce
    ).digest('hex');
  }

  miniBlock(difficulty: number):void{
    while(this.hash.substring(0,difficulty) !== Array(difficulty +1).join("0")){
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`block hash is ${this.hash}`);
  }
}

class BlockChain{
  public chain: Block[];
  public difficulty: number = 4;
  public pendingTransactions: Transaction[] = [];
  public miningReward: number = 100

  constructor(){
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock():Block{
    return new Block(0, Date.now(), [], "0");
  }
  getLatestBlock():Block{
    return this.chain[this.chain.length-1]; 
  }

  minePendingTransactions(miningRewardAddress:string):void{
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    let block = new Block(this.chain.length, Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
    block.miniBlock(this.difficulty);
    console.log("Block successfully mined");
    this.chain.push(block);
    this.pendingTransactions = [];
  }

  addTransaction(transaction:Transaction):void{
    if(!transaction.fromAddress || !transaction.toAddress){
      throw new Error("Transaction must hase sender address and reciever address");
    }

    if(!transaction.isValid()){
      throw new Error("Transaction is not Valid, Cannot add it to chain");
    }
    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address: string):number{
    let balance = 0;
    for(const block of this.chain){
      for(const trans of block.transactions){
        if(trans.fromAddress === address){
          balance -= trans.amount;
        }
        if(trans.toAddress === address){
          balance += trans.amount;
        }
      }      
    }
    return balance;
  }

  isChainValid(): boolean{
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.transactions.every((tx) => tx.isValid())) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.prevHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
  
}


class Transaction{

  constructor(
    public fromAddress:string | null,
    public toAddress:string,
    public amount: number,
    public signature: string = ''
  ){}
  
  calculateHash():string{
    return crypto.createHash('sha256').update(
      (this.fromAddress || '') +
      this.toAddress +
      this.amount
    ).digest('hex');
  }

  signTransaction(signinkey: any):void{
    if(signinkey.getPublic('hex') !== this.fromAddress){
      throw new Error("You cannot sign transactions from other ");
    }

    const hashTx = this.calculateHash();
    const sig = signinkey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid(): boolean{
    if(this.fromAddress === null) return true; // coinbase txn

    if(!this.signature || this.signature.length === 0){
      throw new Error("No signature in this transaction");
    }
    const publicKey = EC.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}



// ws server

const wss = new WebSocket.Server({port:8080});
const btcChain = new BlockChain();

wss.on('connection', (ws: WebSocket) => {
  console.log("New client connected");

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received:`, data);

      if (data.type === 'NEW_TRANSACTION') {
        const newTransaction = new Transaction(data.fromAddress, data.toAddress, data.amount, data.signature);
        btcChain.addTransaction(newTransaction);
        broadcastMessage(JSON.stringify({ type: 'TRANSACTION_ADDED', transaction: newTransaction }));
        
        // Update balances after transaction
        const fromBalance = btcChain.getBalanceOfAddress(data.fromAddress);
        const toBalance = btcChain.getBalanceOfAddress(data.toAddress);
        ws.send(JSON.stringify({ type: 'BALANCE_UPDATE', address: data.fromAddress, balance: fromBalance }));
        broadcastMessage(JSON.stringify({ type: 'BALANCE_UPDATE', address: data.toAddress, balance: toBalance }));
      } else if (data.type === 'GET_BALANCE') {
        const balance = btcChain.getBalanceOfAddress(data.address);
        ws.send(JSON.stringify({ type: 'BALANCE_UPDATE', address: data.address, balance }));
      }else if(data.type === 'SIGN_TRANSACTION'){
        const key = EC.keyFromPrivate(data.privateKey);
        const transaction = new Transaction(data.fromAddress, data.toAddress, data.amount);
        transaction.signTransaction(key);
        broadcastMessage(JSON.stringify({ type: 'SIGNED_TRANSACTION', transaction }));  
      }
    } catch (error:any) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'ERROR', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

function broadcastMessage(message: string): void {
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

console.log('WebSocket server is running on ws://localhost:8080');

// Start mining every 30 seconds
setInterval(() => {
  const myWalletAddress = EC.genKeyPair().getPublic('hex');
  btcChain.minePendingTransactions(myWalletAddress);
  const latestBlock = btcChain.getLatestBlock();
  broadcastMessage(JSON.stringify({
    type: 'NEW_BLOCK',
    ...latestBlock
  }));
}, 30000);