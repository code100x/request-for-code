import { useState } from "react";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";

import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";

import { BlockchainService } from "../lib/helpers/blockChain";
import { MAIN_SERVER } from "../../config.js";

// Initialize bip32 with the ECC library
const bip32 = BIP32Factory(ecc);

const ECPair = ECPairFactory(ecc);

const useBitcoinWallet = () => {
  const [mnemonic, setMnemonic] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [message, setMessage] = useState("");

  const generateWallet = async () => {
    // Generate a 12-word mnemonic
    const newMnemonic = bip39.generateMnemonic();
    setMnemonic(newMnemonic);

    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(newMnemonic);

    // Derive the root node from the seed
    // const root = bip32.fromSeed(seed);
    const network = bitcoin.networks.testnet;

    const root = bip32.fromSeed(seed, network);

    // Derive first Bitcoin address (BIP44 path: m/44'/0'/0'/0/0)
    const path = "m/44'/0'/0'/0/0";
    const child = root.derivePath(path);

    // Get the public and private keys
    const privKey = child.toWIF(); // Wallet Import Format (private key)

    // Generate the Bitcoin address from the public key
    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin, // For Bitcoin Mainnet
    });

    // Set the derived keys and address
    setPrivateKey(privKey);
    setFromAddress(address);
  };
  const signTransaction = async (transaction, privKeyWIF) => {
    // Private key in WIF format
    const privateKeyWIF = privKeyWIF;
    // Convert WIF to key pair
    const keyPair = ECPair.fromWIF(privateKeyWIF, bitcoin.networks.testnet);

    // Serialize the transaction object into a string
    const transactionString = JSON.stringify(transaction);

    // Create a hash of the transaction string (to simulate the message to be signed)
    const encoder = new TextEncoder();
    const data = encoder.encode(transactionString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert hashBuffer to Uint8Array for signing
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashUint8Array = new Uint8Array(hashArray);

    // Sign the hash with the private key
    const signature = keyPair.sign(hashUint8Array);

    // Convert the signature to a hex string
    const signatureHex = Array.from(signature)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("Transaction:", transaction);
    console.log("Signature:", signatureHex);
    return signatureHex;
  };
  const createTransaction = async (toAddress, amount) => {
    if (!mnemonic) {
      setMessage("Wallet not initialized. Please initialize wallet first.");
      return;
    }

    try {
      const blockchainService = new BlockchainService(MAIN_SERVER);
      const transaction = {
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: parseFloat(amount),
      };

      const signedTransactionHex = await signTransaction(
        transaction,
        privateKey
      );
      const result = await blockchainService.createTransaction(
        transaction,
        signedTransactionHex
      );

      setMessage(`Transaction created: ${JSON.stringify(result)}`);

      setMessage(`Transaction created: ${JSON.stringify(result)}`);
    } catch (error) {
      setMessage(`Error creating transaction: ${error.message}`);
    }
  };

  return {
    mnemonic,
    fromAddress,
    privateKey,
    generateWallet,
    createTransaction,
    message,
    setMessage,
  };
};

export default useBitcoinWallet;
