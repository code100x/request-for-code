const express = require('express');
const bip39 = require('bip39');
const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const { derivePath } = require('ed25519-hd-key');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const User = require('./model/User');
const Wallet = require('./model/Wallet');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret_here';

mongoose.connect('mongodb://localhost:27017/solana-wallet')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

function generateHash(data) {
    return crypto.createHash('sha256').update(data).digest();
}

function selectUTXOs(utxos, amount, preference) {
    let selectedUTXOs = [];
    let total = 0;

    if (preference === 'low-fee') {
        utxos.sort((a, b) => b.amount - a.amount); 
    } else if (preference === 'less-dust') {
        utxos.sort((a, b) => a.amount - b.amount); 
    }

    for (let utxo of utxos) {
        selectedUTXOs.push(utxo);
        total += utxo.amount;
        if (total >= amount) break;
    }

    return selectedUTXOs;
}

app.post('/generate-mnemonic', (req, res) => {
    const mnemonic = bip39.generateMnemonic();
    res.status(200).json({ mnemonic });
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ res: false, msg: 'Username and password are required.' });
    }

    try {
        let user = await User.findOne({ username });

        if (user) {
            return res.status(401).json({ res: false, msg: 'Username already exists.' });
        }

        user = new User({ username, password });
        await user.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
        res.status(201).json({ res: true, msg: 'Sign-up successful', token });
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ res: false, msg: 'Server error. Please try again later.' });
    }
});

app.post('/signin',async(req,res)=>{
    const {username,password} = req.body;

    if (!username || !password) {
        return res.status(400).json({ res: false, msg: 'Username and password are required.' });
    }

    try {
        let user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ res: false, msg: 'User doesnot exists.' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);
        res.status(201).json({ res: true, msg: 'Sign-ui successful', token });
    } catch (error) {
        console.error('Error during sign-in:', error);
        res.status(500).json({ res: false, msg: 'Server error. Please try again later.' });
    }

})

app.post('/create-wallet', async (req, res) => {
    const { mnemonic, currentIndex, username } = req.body;

    if (!mnemonic || currentIndex === undefined || !username) {
        return res.status(400).json({ msg: 'Mnemonic, index, and username are required.' });
    }

    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const path = `m/44'/501'/${currentIndex}'/0'`;
        const derivedSeed = derivePath(path, seed.toString('hex')).key;
        const keypair = Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);

        const publicKey = keypair.publicKey.toBase58();
        const secretKey = Buffer.from(keypair.secretKey).toString('hex');

        const newWallet = new Wallet({
            username,
            pub_id: publicKey,
            private_id: secretKey,
        });

        await newWallet.save();

        res.status(200).json({ publicKey, secretKey });
    } catch (err) {
        console.error('Error generating wallet:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.post('/wallet/submit-transaction', async (req, res) => {
    const { sender_pub_id, receiver_pub_id, amount, privateKey, feePreference } = req.body;

    if (!sender_pub_id || !receiver_pub_id || !amount || !privateKey || !feePreference) {
        return res.status(400).json({ msg: 'Missing required fields.' });
    }

    try {
        const balanceResponse = await axios.post('http://localhost:3002/total-balance', { sender_pub_id });
        const balance = balanceResponse.data.totalBalance;

        if (balance < amount) {
            return res.status(400).json({ msg: 'Insufficient balance.' });
        }

        const utxosResponse = await axios.post('http://localhost:3002/getutxos', { sender_pub_id });
        const utxos = utxosResponse.data.UTXOs;

        const selectedUTXOs = selectUTXOs(utxos, amount, feePreference);
        const totalSelectedUTXOs = selectedUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0);

        for (let utxo of selectedUTXOs) {
            await axios.delete('http://localhost:3002/deleteutxo', { data: { id: utxo.utxoId } });
        }

        const timestamp = Date.now().toString();
        const message = `${sender_pub_id}${receiver_pub_id}${amount}${timestamp}`;
        const hash = generateHash(message);

        const senderKeypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        const signature = nacl.sign.detached(hash, senderKeypair.secretKey);

        const transactionPayload = {
            signature: Buffer.from(signature).toString('hex'),
            sender_pub_id,
            receiver_pub_id,
            amount,
            timestamp,
        };
        console.log(`sent ${amount} BTC from ${sender_pub_id} to ${receiver_pub_id} as real txn.`);
        await axios.post('http://localhost:3001/api/submit-transaction', transactionPayload);
        
        // 2nd tranxasction for change(chutta)
        if (totalSelectedUTXOs > amount) {
            const change = totalSelectedUTXOs - amount;
            const changeMessage = `${sender_pub_id}${sender_pub_id}${change}${timestamp}`;
            const changeHash = generateHash(changeMessage);
            const changeSignature = nacl.sign.detached(changeHash, senderKeypair.secretKey);

            const changeTransactionPayload = {
                signature: Buffer.from(changeSignature).toString('hex'),
                sender_pub_id,
                receiver_pub_id: sender_pub_id,
                amount: change,
                timestamp,
            };
            console.log(`sent ${change} BTC from ${sender_pub_id} to ${sender_pub_id} as change txn.`);
            await axios.post('http://localhost:3001/api/submit-transaction', changeTransactionPayload);
        }

        res.status(200).json({ msg: 'Transaction(s) submitted successfully' });
    } catch (err) {
        console.error('Error submitting transaction:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.post('/wallets', async (req, res) => {
    const {username} = req.body;
    try {
        const wallets = await Wallet.find({username:username});
        let wallets_keys=[];
        for(let i=0;i<wallets.length;i++){
            const publicKey=wallets[i].pub_id;
            const secretKey=wallets[i].private_id;
            wallets_keys.push({publicKey,secretKey});
        }
        res.status(200).json(wallets_keys);
    } catch (err) {
        console.error('Error retrieving wallets:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.post('/derive-from-mnemonic', async (req, res) => {
    const { mnemonic, currentIndex } = req.body;

    if (!mnemonic || currentIndex === undefined) {
        return res.status(400).json({ msg: 'Mnemonic and index are required.' });
    }

    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const path = `m/44'/501'/${currentIndex}'/0'`;
        const derivedSeed = derivePath(path, seed.toString('hex')).key;
        const keypair = Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);

        res.status(200).json({
            publicKey: keypair.publicKey.toBase58(),
            privateKey: Buffer.from(keypair.secretKey).toString('hex'),
        });
    } catch (err) {
        console.error('Error deriving keys:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.post('/derive-from-private', (req, res) => {
    const { privateKey } = req.body;

    if (!privateKey) {
        return res.status(400).json({ msg: 'Private key is required.' });
    }

    try {
        const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        res.status(200).json({ publicKey: keypair.publicKey.toBase58(), privateKey });
    } catch (err) {
        console.error('Error deriving public key:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.listen(3004, () => {
    console.log('Wallet backend running on http://localhost:3004');
});
