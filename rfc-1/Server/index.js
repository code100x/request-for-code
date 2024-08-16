const express = require('express');
const { createWallet, signTransaction } = require('./wallet');

const app = express();
app.use(express.json());
app.use(express.static('frontend'));

app.get('/create-wallet', (req, res) => {
    const wallet = createWallet();
    res.json(wallet);
});

app.post('/sign-txn', (req, res) => {
    const { privateKey, transaction } = req.body;
    const signature = signTransaction(privateKey, transaction);
    res.json({ transaction, signature });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
