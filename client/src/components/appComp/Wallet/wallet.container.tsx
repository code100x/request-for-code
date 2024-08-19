import { Button } from "@/components/UI";
import ShowWallet from "./wallet.show";
import SignTransactions from "./wallet.signTx";
import { FaPlus } from "react-icons/fa6";

const WalletContainer = () => {
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
      {/* <div className="flex flex-col mt-6 border border-primary/5 h-48 rounded-xl px-6 py-8">
        <div className="flex justify-between items-center">
          <p className="font-medium">All Generated Addresses</p>
          <Button className="text-sm">
            <FaPlus className="mr-2" />
            New Address
          </Button>
        </div>
      </div> */}
    </>
  );
};

export default WalletContainer;
