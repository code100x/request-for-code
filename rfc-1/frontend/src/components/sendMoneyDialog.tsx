import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { toast } from "sonner";
import nacl from "tweetnacl";
import { decodeUTF8 } from "tweetnacl-util";
import axios from "axios";

const SendMoneyDialog = ({
  wallets,
  state,
  setState,
}: {
  wallets: {
    secret: string;
    public: string;
  }[];
  state: boolean;
  setState: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [selectedWalletSecret, setSelectedWalletSecret] = useState<
    null | string
  >(null);
  const [Amount, setAmount] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");

  const sendTransaction = async () => {
    const toastId = toast.loading("Sending transaction...");
    try {
      if (!selectedWalletSecret || !walletAddress || !Amount)
        throw new Error("All 3 field are required");
      const keypair = Keypair.fromSecretKey(bs58.decode(selectedWalletSecret));
      const baseTransaction = {
        amount: Amount,
        from: keypair.publicKey.toBase58(),
        to: new PublicKey(walletAddress).toBase58(),
        timestamp: Date.now(),
      };

      const transaction = {
        ...baseTransaction,
        signature: bs58.encode(
          nacl.sign.detached(
            decodeUTF8(JSON.stringify(baseTransaction)),
            keypair.secretKey
          )
        ),
      };

      await axios.post(`${import.meta.env.VITE_SERVER_URL ?? ""}/api/v1/send`, {
        transaction,
      });
      toast.success("Transaction success", { id: toastId });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong ", { id: toastId });
    }
  };

  return (
    <div>
      <Dialog
        open={state}
        onOpenChange={(e) => {
          if (e === false) setState(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Money?</DialogTitle>
            <DialogDescription>
              <div className="my-6">
                <div>
                  <Label className="mb-3 inline-block">Select Wallet</Label>
                  <Select
                    onValueChange={(e) => {
                      setSelectedWalletSecret(e);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet, index) => (
                        <SelectItem value={wallet.secret} key={wallet.public}>
                          Account: {++index}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-6">
                  <Label className="mb-3 inline-block">Enter Amount</Label>
                  <Input
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setAmount(Number(e.target.value));
                    }}
                    type="number"
                  />
                </div>
                <div className="mt-6">
                  <Label className="mb-3 inline-block">Wallet Address</Label>
                  <Input
                    type="text"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setWalletAddress(e.target.value);
                    }}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={sendTransaction}>Send</Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SendMoneyDialog;
