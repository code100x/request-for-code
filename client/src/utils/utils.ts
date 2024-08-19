import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import * as bip39 from "bip39";
// import * as crypto from "crypto";
import ECPairFactory from "ecpair";

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);
const network = bitcoin.networks.testnet;

const path = "m/44'/1'/0'/0";

export const generateBitcoinWallet = () => {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);

  const child = root.derivePath(path);

  const node = child.derive(0).derive(0);

  const address = bitcoin.payments.p2pkh({
    pubkey: node.publicKey,
    network,
  }).address;

  return {
    mnemonic,
    publicKey: address,
    privateKey: node.toWIF(),
  };
};

export const generateMoreAddresses = (index: number, mnemonic: string) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, network);
  const newPath = `m/44'/1'/${index}'/0'`;
  const child = root.derivePath(newPath);
  const node = child.derive(0).derive(0);
  const address = bitcoin.payments.p2pkh({
    pubkey: node.publicKey,
    network,
  }).address;
  return {
    publicKey: address,
    privateKey: node.toWIF(),
  };
};

export const createAndSignTransaction = (
  transaction: any,
  privateKey: string
) => {
  try {
    const transactionBuffer = Buffer.from(JSON.stringify(transaction));

    // Create key pair from WIF
    const keyPair = ECPair.fromWIF(privateKey, network);

    // Sign the transaction
    const sigHash = bitcoin.crypto.hash256(transactionBuffer);
    const signature = keyPair.sign(sigHash);

    const signedTransaction = {
      ...transaction,
      signature: signature.toString("hex"),
      publicKey: keyPair.publicKey.toString("hex"),
    };
    return signedTransaction;
  } catch (error) {
    console.error("Transaction creation error:", error);
    throw error;
  }
};
