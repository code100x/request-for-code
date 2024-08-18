const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const Wallet = require('./model/wallet'); 

const app = express();
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/wallet_service');

app.post('/wallet', async (req, res) => {
    const id = `wallet_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const pub_id = crypto.randomBytes(16).toString('hex'); 
    const private_id = crypto.randomBytes(32).toString('hex');

    try {
        const wallet = await Wallet.create({
            id,
            pub_id,
            private_id,
        });
        res.status(201).json({
            id: wallet.id,
            pub_id: wallet.pub_id,
            private_id: wallet.private_id,
        });
    } catch (err) {
        console.error('Error creating wallet:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.get('/wallet/balance/:pub_id', async (req, res) => {
    const { pub_id } = req.params;

    try {
        const response = await axios.post('http://localhost:3002/getbalance', { id: pub_id });
        res.status(200).json({ balance: response.data.balance });
    } catch (err) {
        console.error('Error fetching balance:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.post('/wallet/transaction', async (req, res) => {
    const { transaction_id, sender_pub_id, receiver_pub_id, amount } = req.body;
    // console.log(req.body);
    const timestamp = Date.now();

    try {
        const response = await axios.post('http://localhost:3001/api/submit-transaction', {
            transaction_id,
            sender_pub_id,
            receiver_pub_id,
            amount,
            timestamp,
        });

        res.status(200).json({ msg: 'Transaction submitted successfully, it may take time to process your transaction completely as we cirrenlty have very less users' });
    } catch (err) {
        console.error('Error starting transaction:', err);
        res.status(500).json({ msg: 'Internal server error' });
    }
});

app.listen(3004, () => {
    console.log('Wallet service running on http://localhost:3004');
});
