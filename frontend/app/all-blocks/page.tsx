"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import { BellRing, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const socket = io("http://localhost:3002");

const AllBlocks = () => {
  const [getBlockchain, setGetBlockchain] = useState<any[]>([]);

  // Handle incoming blockchain data and new blocks
  useEffect(() => {
    // Handler for blockchain data
    const handleBlockchain = (blockchain: any[]) => {
      console.log("Received blockchain data:", blockchain);
      setGetBlockchain(blockchain);
    };

    // Handler for new block
    const handleBlockAdded = (block: any) => {
      console.log("New block added:", block);
      setGetBlockchain((prevBlockchain) => [...prevBlockchain, block]);
    };

    socket.on("blockchain", handleBlockchain);
    socket.on("blockAdded", handleBlockAdded);

    // Cleanup function to avoid memory leaks
    return () => {
      socket.off("blockchain", handleBlockchain);
      socket.off("blockAdded", handleBlockAdded);
    };
  }, []);

  // Log the current blockchain state
  useEffect(() => {
    console.log("Current blockchain state:", getBlockchain);
  }, [getBlockchain]);

  return (
    <div className="container mx-auto flex flex-col my-20 ">
      <h2 className="text-4xl text-center font-semibold">Blockchain</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {getBlockchain.length === 0 ? (
          <p>No blocks yet.</p>
        ) : (
          getBlockchain.map((block) => (
            <BlockCard key={block.index} block={block} />
          ))
        )}
      </div>
    </div>
  );
};

const BlockCard = ({ block }: { block: any }) => (
  <Card className="w-[410px] shadow-sm">
    <CardHeader>
      <CardTitle>Block {block.index}</CardTitle>
      <CardDescription>This is a valid block</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4">
      <div>
        <div
          key={block.index}
          className="mb-4 grid grid-row-[25px_1fr] pb-4 last:mb-0 last:pb-0 gap-4"
        >
          <h1 className="font-semibold mb-2">Nonce : {block.nonce}</h1>
          <h1 className="font-semibold text-lg">Data :</h1>
          <div className="space-y-1 bg-slate-200 p-2 rounded-md flex flex-col gap-1 overflow-hidden">
           
            <p className="text-sm font-medium leading-none">
              {block.title}
            </p>
            <p className="text-muted-foreground">
              <span className="text-black">Timestamp :</span> {new Date(block.timestamp).toLocaleString()}
            </p>
            <p className="text-muted-foreground">
              <span className="text-black">From :</span>
              {typeof block.data === "object" ? JSON.stringify(block.data.from) : block.data.from}
            </p>
            <p className="text-muted-foreground">
              <span className="text-black">To :</span>
              {typeof block.data === "object" ? JSON.stringify(block.data.to) : block.data.to}
            </p>
            <p className="text-muted-foreground">
              <span className="text-black">Amount :</span>
              {typeof block.data === "object" ? JSON.stringify(block.data.amount) : block.data.amount}
            </p>
          </div>
          <div className="w-[300px] overflow-hidden">
            <h1 className="text-lg font-medium">Prev Hash:</h1>
            <p className="text-sm">{block.prevHash}</p>
          </div>
          <div className="w-[300px] overflow-hidden">
            <h1 className="text-lg font-medium">Hash:</h1>
            <p className="text-sm">{block.hash}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AllBlocks;
