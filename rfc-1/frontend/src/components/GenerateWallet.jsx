import React, { useEffect } from "react";
import { networks, payments } from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

const ECPair = ECPairFactory(ecc);

function Wallet({ balance, address, setAddress }) {
  useEffect(() => {
    // Generate a new Bitcoin address
    const keyPair = ECPair.makeRandom({ network: networks.bitcoin });

    const pubkey = keyPair.publicKey;

    // Get private key
    const privKey = keyPair.toWIF();
    console.log(privKey);

    // Generate a P2PKH address
    const { address } = payments.p2pkh({ pubkey, network: networks.bitcoin });
    setAddress(address);
  }, [setAddress]);

  return (
    <div className="Wallet">
      <h2>Wallet</h2>
      <p>Address: {address}</p>
      <p>Balance: {balance} BTC</p>
    </div>
  );
}

export default Wallet;
