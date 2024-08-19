import { Button, Input } from "@/components/UI";
import { useAppStore } from "@/store";
import { createAndSignTransaction } from "@/utils/utils";
import { useState } from "react";
import { toast } from "sonner";

const SignTransactions = () => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [receipient, setReceipient] = useState("");
  const { wallet, utxos, wsClient, walletBalance, sendEventRequest } =
    useAppStore((state) => ({
      wallet: state.wallet,
      utxos: state.utxos,
      wsClient: state.wsClient,
      walletBalance: state.walletBalance,
      sendEventRequest: state.sendEventRequest,
    }));

  const sendTransaction = async () => {
    if (!wallet) return toast.error("Please create a wallet first");
    if (!amount || !receipient) return toast.error("Please fill all fields");
    try {
      const amountInSatoshis = Math.floor(parseFloat(amount) * 100000000);
      if (amountInSatoshis > walletBalance) {
        return toast.error("Insufficient balance");
      }

      if (utxos.length === 0) {
        return toast.error("No UTXOs available");
      }

      const transaction = {
        inputs: utxos.map((utxo) => ({
          txid: utxo.txid,
          vout: utxo.vout,
          amount: utxo.amount,
          address: utxo.address,
        })),
        outputs: [
          { address: receipient, amount: amountInSatoshis },
          {
            address: wallet.publicKey,
            amount: walletBalance - amountInSatoshis,
          },
        ],
        timestamp: Date.now(),
      };

      const signedTransaction = createAndSignTransaction(
        transaction,
        wallet.privateKey
      );

      if (wsClient)
        wsClient.send(
          JSON.stringify({
            type: "NEW_TRANSACTION",
            transaction: signedTransaction,
          })
        );
      //   console.log("Transaction sent:", transaction.id);
      toast.success("Transaction sent successfully");
      sendEventRequest();
      setAmount("");
      setReceipient("");
    } catch (error) {
      console.error("error", error);
      toast.error("Error signing and sending transaction");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <p className="text-xl font-semibold">
        Sign and Send Transaction to Blockchain
      </p>
      <Input
        label="Amount"
        wrapperClassName="mt-2"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        label="Receipient Address"
        wrapperClassName="mt-5"
        placeholder="Enter Receipient Address"
        value={receipient}
        onChange={(e) => setReceipient(e.target.value)}
      />
      <Button
        loading={loading}
        disabled={loading}
        onClick={sendTransaction}
        className="mt-5"
      >
        Sign and Send
      </Button>
    </div>
  );
};

export default SignTransactions;
