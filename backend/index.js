const express = require('express');
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const cors  = require("cors");
const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')

const bip32 = BIP32Factory(ecc)
const { isValidTransaction } = require('./src/utils/utils.js');

const { UTXOPool } = require('./src/utxo/UTXOPool.js');
const utxoPool = new UTXOPool(); 

const { network, path } = require('./config.js'); 


const app = express();
const port = 5000;  
app.use(cors());

app.use(express.json());
const blockchainServer = require('./src/blockchain/blockchainServer.js');
const minerServer = require('./src/blockchain/minerServer.js');

function generateWallet() {

    let mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    const root = bip32.fromSeed(seed, network);
    console.log(root);
    
        let account = root.derivePath(path);
    
    
    let node = account.derive(0).derive(0);
    
    
    let btcAddress = bitcoin.payments.p2pkh({
      pubkey: node.publicKey,
      network,
    }).address;
    
    return {
      address: btcAddress,
      key: node.toWIF(),
      mnemonic: mnemonic,
    };
  }
  
  
  app.get('/create-wallet', (req, res) => {
    try {
      const wallet = generateWallet();
      res.json(wallet);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: 'Failed to create wallet' });
    }
  });

  app.get('/utxos/:address', (req, res) => {
    const address = req.params.address;
    const utxos = Object.values(utxoPool.utxos).filter(utxo => utxo.address === address);
    res.json(utxos);
  });

  
 


  app.post('/send-transaction', (req, res) => {
    const transaction = req.body;

    if (isValidTransaction(transaction, UTXOPool)) {

      processTransaction(transaction);
      res.json({ success: true, message: 'Transaction is valid and processed.' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid transaction.' });
    }
  });
  
  
  function processTransaction(transaction) {
    transaction.inputs.forEach(input => {
      delete UTXOPool[input.txId + ':' + input.index];
    });
  
    transaction.outputs.forEach((output, index) => {
      const txId = transaction.id; 
      UTXOPool[txId + ':' + index] = {
        amount: output.amount,
        address: output.address
      };
    });
  
  }



  app.post('/sign-transaction', (req, res) => {
    const { transactionData, privateKey } = req.body;
  
    try {
      const { inputs, outputs } = transactionData;
      const network = bitcoin.networks.bitcoin; 
  
      const txb = new bitcoin.TransactionBuilder(network);
  
      inputs.forEach(input => {
        txb.addInput(input.txId, input.index);
      });
 
      outputs.forEach(output => {
        txb.addOutput(output.address, output.amount);
      });
  
      inputs.forEach((input, index) => {
        const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);
        txb.sign(index, keyPair);
      });
  
      const signedTransaction = txb.build().toHex();
      res.json({ signedTransaction });
    } catch (error) {
      res.status(500).json({ message: 'Error signing transaction', error });
    }
  });




  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  