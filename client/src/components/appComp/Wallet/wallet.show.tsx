import { Button } from "@/components/UI";
import { useAppStore } from "@/store";
import { formatAddress, formatAmount } from "@/utils/customFn";
import { useState } from "react";
import { LuCopy } from "react-icons/lu";
import { toast } from "sonner";

const ShowWallet = () => {
  const { wallet, walletBalance } = useAppStore((state) => ({
    wallet: state.wallet,
    walletBalance: state.walletBalance,
  }));
  const [show, setShow] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet?.publicKey as string);
    toast("Address copied to clipboard");
  };

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(wallet?.privateKey as string);
    toast("Private key copied to clipboard");
  };

  const copySeed = () => {
    navigator.clipboard.writeText(wallet?.mnemonic as string);
    toast("Seed phrase copied to clipboard");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-white/60 text-sm font-medium">Balance</p>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-3xl">
            {formatAmount(walletBalance)}{" "}
            <span className="text-white/60 text-sm">BTC</span>
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-white/60 text-sm font-medium">Address</p>
        <div className="flex items-center gap-2">
          <p className="font-semibold">
            {formatAddress(wallet?.publicKey as string, 8)}{" "}
          </p>
          <button onClick={copyAddress}>
            <LuCopy />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-white/60 text-sm font-medium">Private key</p>
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {show ? (
            <p className="font-semibold h-6">
              {formatAddress(wallet?.privateKey as string, 10)}
            </p>
          ) : (
            <p className="font-semibold text-xl h-6">**********************</p>
          )}

          <button onClick={copyPrivateKey}>
            <LuCopy />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-white/60 text-sm font-medium">
          Seed phrase (mnemonic)
        </p>
        <div className="flex flex-col gap-2">
          {showSeed ? (
            <p className="font-semibold">{wallet?.mnemonic}</p>
          ) : (
            <p className="font-semibold text-xl">**********************</p>
          )}

          <div className="flex gap-3 mt-2">
            <Button
              onClick={() => setShowSeed((prev) => !prev)}
              className="h-9"
              variant="outline"
            >
              {showSeed ? "Hide" : "Show"}
            </Button>
            <Button className="h-9" onClick={copySeed}>
              <LuCopy className="mr-1.5" /> Copy seed phrase
            </Button>
          </div>
        </div>
      </div>

      <p className="font-medium text-primary/70 text-sm">
        <span className="text-red-500">NOTE</span>: Do not share your private
        key or seed phrase with anyone.
      </p>
    </div>
  );
};

export default ShowWallet;
