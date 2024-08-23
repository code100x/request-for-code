import { SiHiveBlockchain } from "react-icons/si";
import { GrTransaction } from "react-icons/gr";
import { MdOutlineHardware } from "react-icons/md";
import { IoWalletOutline } from "react-icons/io5";

import { useAppStore } from "@/store";
import TransactionTable from "@/components/appComp/TransactionTable";

const cmnCls = "bg-white/5 p-5 rounded-xl shadow-md ";
const textCls = "text-lg text-white/50 font-medium mt-4";

const BlockchainStats = () => {
  const { blockStats, allTransactions } = useAppStore((state) => ({
    blockStats: state.blockStats,
    allTransactions: state.allTransactions,
  }));
  return (
    <div className="flex flex-col mt-8">
      <p className="text-2xl font-semibold">BC-Chain Stats</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
        <div className={`${cmnCls}`}>
          <SiHiveBlockchain className="text-4xl text-white" />
          <p className={`${textCls}`}>Total Blocks</p>
          <p className="text-5xl font-semibold">{blockStats.totalBlocks}</p>
        </div>
        <div className={`${cmnCls}`}>
          <GrTransaction className="text-4xl text-white" />
          <p className={`${textCls}`}>Total Transactions</p>
          <p className="text-5xl font-semibold">
            {blockStats.totalTransactions}
          </p>
        </div>
        <div className={`${cmnCls}`}>
          <IoWalletOutline className="text-4xl text-white" />
          <p className={`${textCls}`}>Total wallets</p>
          <p className="text-5xl font-semibold">{blockStats.totalWallets}</p>
        </div>
        <div className={`${cmnCls}`}>
          <MdOutlineHardware className="text-4xl text-white" />
          <p className={`${textCls}`}>Current Difficulty</p>
          <p className="text-5xl font-semibold">{blockStats.difficulty}</p>
        </div>
      </div>

      <div className="flex flex-col mt-10 mb-20">
        <p className="font-medium text-lg">All Transactions</p>

        <TransactionTable transcations={allTransactions} />
      </div>
    </div>
  );
};

export default BlockchainStats;
