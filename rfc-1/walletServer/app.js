const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors'); 

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/createWallet', (req, res) => {
  const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const wallet = {
    address: keyPair.publicKey.export({ type: 'pkcs1', format: 'pem' }),
    privateKey: keyPair.privateKey.export({ type: 'pkcs1', format: 'pem' }),
  };
  res.json(wallet);
  console.log(wallet);
});

app.post('/signTransaction', (req, res) => {
  const { transaction } = req.body;
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(transaction));
  sign.end();
  const signature = sign.sign(req.body.privateKey, 'hex');
  res.json({ ...transaction, signature });
});

app.post('/sendTransaction', (req, res) => {
  console.log('Transaction sent:', req.body.transaction);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Wallet server running on http://localhost:${PORT}`));
