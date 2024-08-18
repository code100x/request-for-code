import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import * as bip39 from "bip39";

const bip32 = BIP32Factory(ecc);
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
