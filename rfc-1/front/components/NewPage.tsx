"use client";
import React, { useState, useEffect } from "react";
import { ec } from "elliptic";
import * as crypto from "crypto";

const EC = new ec("secp256k1");

const NewPage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const savedWalletAddress = localStorage.getItem("walletAddress");
    const savedPrivateKey = localStorage.getItem("privateKey");

    if (savedWalletAddress && savedPrivateKey) {
      setWalletAddress(savedWalletAddress);
      setPrivateKey(savedPrivateKey);
    }

    const socket = new WebSocket("ws://localhost:8080");
    setWs(socket);

    socket.onopen = () => {
      console.log("Connected to WebSocket server");
      if (savedWalletAddress) {
        requestBalance(savedWalletAddress);
      }
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);
      if (
        message.type === "BALANCE_UPDATE" &&
        message.address === walletAddress
      ) {
        setBalance(message.balance);
      } else if (message.type === "ERROR") {
        alert(`Error: ${message.message}`);
      }
    };

    return () => {
      socket.close();
    };
  }, [walletAddress]);

  const generateNewWallet = () => {
    const key = EC.genKeyPair();
    const publicKey = key.getPublic("hex");
    const privKey = key.getPrivate("hex");

    setWalletAddress(publicKey);
    setPrivateKey(privKey);

    localStorage.setItem("walletAddress", publicKey);
    localStorage.setItem("privateKey", privKey);

    requestBalance(publicKey);
  };

  const clearWallet = () => {
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("privateKey");
    setWalletAddress("");
    setPrivateKey("");
    setBalance(0);
    alert("Wallet has been cleared.");
  };

  const requestBalance = (address: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "GET_BALANCE", address }));
    }
  };

  const sendTransaction = () => {
    if (!walletAddress || !privateKey) {
      alert("Please generate a wallet first!");
      return;
    }

    const key = EC.keyFromPrivate(privateKey);

    const transaction = {
      fromAddress: walletAddress,
      toAddress,
      amount: parseFloat(amount),
    };

    const transactionHash = crypto
      .createHash("sha256")
      .update(walletAddress + toAddress + amount)
      .digest("hex");

    const signature = key.sign(transactionHash).toDER("hex");

    const signedTransaction = {
      type: "NEW_TRANSACTION",
      ...transaction,
      signature,
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(signedTransaction));
      setAmount("");
      setToAddress("");

      setTimeout(() => {
        requestBalance(walletAddress);
      }, 1000);
    } else {
      alert("WebSocket connection is not open. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-4xl font-bold mb-5 text-center text-gray-800">
            Simple Bitcoin-like Wallet
          </h1>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">
              Your Wallet
            </h2>
            <p className="mb-2 text-sm text-gray-600 break-all">
              Address: {walletAddress || "No wallet generated"}
            </p>
            <p className="mb-4 text-sm text-gray-600">
              Balance: {balance} coins
            </p>
            <button
              onClick={generateNewWallet}
              className="w-full bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
            >
              Generate New Wallet
            </button>

            {/* Refresh Balance Button */}
            <button
              onClick={() => requestBalance(walletAddress)}
              className="mt-4 w-full bg-yellow-500 text-white rounded-md px-4 py-2 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition"
            >
              Refresh Balance
            </button>

            {/* Clear Wallet Button */}
            <button
              onClick={clearWallet}
              className="mt-4 w-full bg-red-500 text-white rounded-md px-4 py-2 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
            >
              Clear Wallet
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">
              Send Transaction
            </h2>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="toAddress"
              >
                To Address:
              </label>
              <input
                id="toAddress"
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="amount"
              >
                Amount:
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <button
              onClick={sendTransaction}
              className="w-full bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPage;
