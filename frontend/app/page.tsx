"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Initialize socket connection to Miner Server
const socket = io("http://localhost:3002");

const Home = () => {
  const [wallet, setWallet] = useState<{ address: string; key: string } | null>(
    null
  );
  const [transaction, setTransaction] = useState("");
  const [amount, setAmount] = useState("");
  const [showKey, setShowKey] = useState(false)

  const createWallet = async () => {
    try {
      const response = await fetch("http://localhost:5000/create-wallet");
      const data = await response.json();
      console.log("Wallet created:", data);
      setWallet(data);
    } catch (error) {
      console.log("Error creating wallet:", error);
    }
  };

  // Function to send a transaction
  const sendTransaction = () => {
    if (wallet) {
      const transactionData = {
        from: wallet.address,
        to: transaction,
        amount,
      };
      console.log("Sending transaction:", transactionData);
      socket.emit("mineBlock", transactionData);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-dotted bg-dot-size">

      {!wallet ? (
        <>
          <div className="w-[400px] mx-auto flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold">Bitcoin Wallet</h1>
            <p className="text-center mt-5 text-black/80">Effortlessly create your Bitcoin wallet and send transactions securely in just a few clicks.</p>
          </div>
          <Button size="lg" onClick={createWallet} className="mt-8 text-md">Create Wallet</Button>
        </>
      ) : <>
        <div className="md:w-[430px] w-[400px]  mx-auto flex flex-col gap-2 border px-4 py-4 rounded-lg">
          <h1 className="text-center text-4xl font-bold tracking-tight bf">Your wallet</h1>
          <p className="font-bold mt-2">Address:</p>
          <div className="mb-2 font-semibold bg-slate-200 py-2 rounded-md px-1 flex text-sm md:text-base items-center justify-center gap-2">{wallet.address}</div>
          <p className="font-bold">Secret Key:</p>
          {wallet && (

            <div className='flex items-center gap-2'>
              <Input
                type={showKey ? "text" : "password"}
                value={wallet.key}
                readOnly
                className='border p-2 w-full'
              />
              <Button
                variant="outline"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}
          <p className="font-bold">Recipient address:</p>
          <Input
            type="text"
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
            placeholder="Enter recipient address"
          />
          <p className="font-bold">BTC Amount:</p>
          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <Button onClick={sendTransaction} className="mt-2">
            Send Transaction
          </Button>
        </div>
      </>
      }
    </div>
  );
};

export default Home;
