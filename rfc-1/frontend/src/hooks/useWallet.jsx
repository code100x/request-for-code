import React, { useEffect, useState } from "react";
import { networks, payments } from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

const ECPair = ECPairFactory(ecc);

function useWallet() {
  const [WalletAddress, setWalletAddress] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  // Generate a new Bitcoin address
  useEffect(() => {
    const keyPair = ECPair.makeRandom({ network: networks.bitcoin });

    const pubkey = keyPair.publicKey;

    // Get private key
    const privKey = keyPair.toWIF();

    // Generate a P2PKH address
    const { address } = payments.p2pkh({ pubkey, network: networks.bitcoin });

    setPublicKey(pubkey.toString("hex"));
    setPrivateKey(privKey);
    setWalletAddress(address);
  }, []);
  return { publicKey, privateKey, WalletAddress };
}

export default useWallet;
