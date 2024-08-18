import express from "express";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import cors from "cors";

// Initialize bip32 with the ECC library
const bip32 = BIP32Factory(ecc);

const network = bitcoin.networks.testnet;
const path = "m/44'/1'/0'/0";

const app = express();
const port = 5000;
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type"],
    credentials: true,
  })
);

function generateWallet() {
  let mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);

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

app.get("/create-wallet", (req, res) => {
  const wallet = generateWallet();
  res.json(wallet);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
