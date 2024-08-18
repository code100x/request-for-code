import ShowWallet from "./wallet.show";
import SignTransactions from "./wallet.signTx";

const WalletContainer = () => {
  return (
    <div className="flex lg:flex-row flex-col gap-4 mt-20">
      <div className="w-1/3 bg-white/5 rounded-xl px-6 py-10">
        <ShowWallet />
      </div>
      <div className="w-2/3 bg-white/5 rounded-xl px-6 py-10">
        <SignTransactions />
      </div>
    </div>
  );
};

export default WalletContainer;
