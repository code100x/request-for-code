import React, { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import axios from "axios";

interface ITransaction {
  amount: number;
  from: string;
  to: string;
  post: [number, number];
  pre: [number, number];
  seq: number;
  signature: string;
  timestamp: number;
}

const Account = () => {
  const { pathname } = useLocation();
  const [transactions, setTransactions] = useState<
    {
      amount: number;
      from: string;
      to: string;
      post: [number, number];
      pre: [number, number];
      seq: number;
      signature: string;
      timestamp: number;
    }[]
  >([]);
  const [publicKey, setPublicKey] = useState("");

  const [balance, setBalance] = useState<
    | { status: "loading" }
    | {
        status: "done";
        amount: number;
      }
  >({
    status: "loading",
  });

  const getBalance = useCallback(async () => {
    try {
      const res = await axios.get(
        `${
          import.meta.env.VITE_SERVER_URL ?? ""
        }/api/v1/balance?key=${publicKey}`
      );
      setBalance({
        status: "done",
        amount: res.data.balance,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log(`error`);
    }
  }, [publicKey]);
  const getTransactions = useCallback(async () => {
    try {
      const res = await axios.get(
        `${
          import.meta.env.VITE_SERVER_URL ?? ""
        }/api/v1/transactions?key=${publicKey}`
      );
      setTransactions(res.data.transactions);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log(`error`);
    }
  }, [publicKey]);
  useEffect(() => {
    console.log(`lj`);
    if (publicKey) {
      getBalance();
      getTransactions();
    }
  }, [publicKey, getBalance, getTransactions]);

  useEffect(() => {
    setPublicKey(pathname.replace("/", ""));
  }, [pathname]);
  const getAirDrop = async () => {
    const toastId = toast.loading("Requesting airdrop takes 2min", {
      description:
        "Sometime its fails due to sol net so you can use sol faucet to do so.",
    });
    try {
      const publicKey = pathname.replace("/", "");
      const res = await axios.get(
        `${
          import.meta.env.VITE_SERVER_URL ?? ""
        }/api/v1/airdrop?key=${publicKey}`
      );
      if (res.status === 200) {
        console.log(res.data);
        if (res.data.transaction) {
          getBalance();
          getTransactions();
          toast.success("Done", { id: toastId });
        } else {
          toast.warning("Failed to record request please resend it ", {
            id: toastId,
          });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Something went wrong in airdrop", {
        description:
          "Sometime its fails due to sol net so you can use sol faucet to do so.",
        id: toastId,
      });
    }
  };

  const getTransactionAmount = (transaction: ITransaction): number => {
    if (transaction.from === publicKey) {
      return transaction.post[0] - transaction.pre[0];
    } else {
      return transaction.post[1] - transaction.pre[1];
    }
  };

  return (
    <div>
      {" "}
      <div className="container md:mt-12 mt-6">
        <h1 className="md:text-2xl text-lg font-bold">Your Explorer</h1>
        <h2 className="text-lg font-bold mt-3 ">Public Key: {publicKey}</h2>
        <p className="font-bold text-muted-foreground">
          Balance : {balance.status === "done" && balance.amount} COINS
        </p>
        <div className="mt-4">
          <Button onClick={getAirDrop}>Request AirDrop</Button>
        </div>
        <div className="mt-6">
          <Table>
            <TableCaption>A list of your recent transactions.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">S.no</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell> {transaction.signature} </TableCell>
                  <TableCell className="text-right">
                    {getTransactionAmount(transaction)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Account;
