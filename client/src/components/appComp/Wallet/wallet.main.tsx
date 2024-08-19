import { Button } from "@/components/UI";
import { useAppStore } from "@/store";
import { generateBitcoinWallet } from "@/utils/utils";
import { IoWalletOutline } from "react-icons/io5";

const Wallet = () => {
  const { setWallet, wsClient } = useAppStore((state) => ({
    setWallet: state.setWallet,
    wsClient: state.wsClient,
  }));
  const handleGererateWallet = () => {
    const res = generateBitcoinWallet();
    if (res.mnemonic && res.publicKey && res.privateKey) {
      const myWallet = {
        mnemonic: res.mnemonic,
        publicKey: res.publicKey,
        privateKey: res.privateKey,
      };
      setWallet(myWallet);
      if (wsClient) {
        wsClient.send(
          JSON.stringify({
            type: "CREATE_WALLET",
            address: myWallet.publicKey,
          })
        );
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto border border-primary/5 bg-white/5 rounded-3xl mt-20 px-8 py-20 flex flex-col items-center">
      <div className="w-24 h-24 flex justify-center items-center rounded-full bg-white/5 text-6xl text-primary">
        <IoWalletOutline />
      </div>
      <p className="text-3xl font-semibold text-center mt-6 max-w-sm">
        Lets create your first bitcoin wallet
      </p>
      <p className="text-sm text-white/60 mt-4">
        Are you ready to create your first bitcoin wallet? Lets get started
      </p>
      <Button className="mt-10" onClick={handleGererateWallet}>
        Create Wallet
      </Button>
    </div>
  );
};

export default Wallet;
