import React, { useState, useEffect } from "react";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import { address, networks, payments, TransactionBuilder } from "bitcoinjs-lib";
import { sha256 } from "js-sha256"; // Make sure to install js-sha256
import { ec as EC } from "elliptic"; // Make sure to install elliptic
import useWallet from "./hooks/useWallet";

const ECPair = ECPairFactory(ecc);
const ec = new EC("secp256k1");

const BitcoinWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [ws, setWs] = useState(null);
  const [events, setEvents] = useState([]);

  const { publicKey, privateKey, WalletAddress } = useWallet();
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents((prevEvents) => [data, ...prevEvents].slice(0, 10));
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (publicKey && privateKey && WalletAddress) {
      setWallet({ publicKey, privateKey, WalletAddress });
    }
  }, [publicKey, privateKey, WalletAddress]);

  const signAndSendTransaction = () => {
    if (!wallet) {
      alert("Please create a wallet first");
      return;
    }

    const transaction = {
      from: wallet.WalletAddress,
      to: recipient,
      amount: parseFloat(amount),
    };

    console.log(transaction);

    const transactionHash = calculateTransactionHash(transaction);
    const key = ec.keyFromPrivate(wallet.privateKey, "hex");
    const signature = key.sign(transactionHash).toDER("hex");

    const signedTransaction = {
      ...transaction,
      signature,
    };

    console.log("signed", signedTransaction);

    ws.send(
      JSON.stringify({
        type: "NEW_TRANSACTION",
        data: signedTransaction,
      })
    );

    alert("Transaction sent to miners");
  };

  const calculateTransactionHash = (transaction) => {
    // Create a simple hash of the transaction details
    const data = transaction.from + transaction.to + transaction.amount;
    return sha256(data); // Generate SHA256 hash of the transaction data
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="border-b border-gray-500">
        <h2 className="text-xl font-semibold text-gray-500 p-4 px-2">
          Knight-Chain
        </h2>
      </div>

      <div className="flex mt-8 border-b p-9 border-gray-600 justify-center overflow-y-auto">
        {wallet ? (
          <div className="flex gap-4">
            <div className="w-1/2 border-r border-gray-500 flex flex-col items-end px-16 gap-4">
              <p className="bg-gray-200 my-7 text-black p-2 rounded-md break-words">
                <span className="text-lg font-bold flex items-start">
                  Your Public Key:
                </span>
                {wallet.WalletAddress}
              </p>
            </div>
            <div className="w-full flex-col flex gap-5">
              <h1 className="text-lg font-semibold"> Transactions</h1>
              <input
                className="bg-gray-200 p-2 rounded-md text-black"
                type="text"
                placeholder="Recipient Public Key"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <input
                className="w-1/2 bg-gray-200 p-2 rounded-md text-black"
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="w-1/4 bg-white text-black px-3 py-2 rounded-lg font-semibold hover:bg-gray-200"
                onClick={signAndSendTransaction}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <button className="bg-white text-black px-5 py-3 rounded-lg font-semibold hover:bg-gray-200">
            Create Wallet
          </button>
        )}
      </div>
      <div className="flex flex-col items-center p-4 mt-8 overflow-auto">
        <h1 className="text-lg font-semibold mb-4">Chain Events:</h1>
        <div className="w-full max-w-3xl bg-gray-800 p-4 rounded-lg shadow-md">
          <ul className="space-y-2">
            {events.map((event, index) => (
              <li
                key={index}
                className="bg-gray-700 p-3 rounded-md break-words"
              >
                [{event.timestamp}] <strong>{event.type}:</strong>{" "}
                {JSON.stringify(event.data)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BitcoinWallet;
