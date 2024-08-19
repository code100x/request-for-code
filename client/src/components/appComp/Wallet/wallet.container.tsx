import ShowWallet from "./wallet.show";
import SignTransactions from "./wallet.signTx";
import TransactionTable from "../TransactionTable";
import { useAppStore } from "@/store";

const WalletContainer = () => {
  const { myTransactions } = useAppStore((state) => ({
    myTransactions: state.myTransactions,
  }));
  console.log("myTransactions", myTransactions);
  return (
    <>
      <div className="flex lg:flex-row flex-col gap-4 mt-20">
        <div className="lg:w-1/3 w-full bg-primary/5 rounded-xl px-6 py-8">
          <ShowWallet />
        </div>
        <div className="lg:w-2/3 w-full bg-primary/5 rounded-xl px-6 py-8">
          <SignTransactions />
        </div>
      </div>
      <div className="flex flex-col mt-10 mb-20">
        <p className="font-medium text-lg">My Transactions</p>

        <TransactionTable transcations={myTransactions} />
      </div>
    </>
  );
};

export default WalletContainer;
