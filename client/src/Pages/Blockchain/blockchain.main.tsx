import { SiHiveBlockchain } from "react-icons/si";
import { GrTransaction } from "react-icons/gr";
import { MdOutlineHardware } from "react-icons/md";

const cmnCls = "bg-white/5 p-5 rounded-xl shadow-md ";
const textCls = "text-lg text-white/50 font-medium mt-4";

const BlockchainStats = () => {
  return (
    <div className="flex flex-col mt-8">
      <p className="text-2xl font-semibold">BC-Chain Stats</p>
      <div className="grid md:grid-cols-3 gap-5 mt-10">
        <div className={`${cmnCls}`}>
          <SiHiveBlockchain className="text-4xl text-white" />
          <p className={`${textCls}`}>Total Blocks</p>
          <p className="text-5xl font-semibold">0</p>
        </div>
        <div className={`${cmnCls}`}>
          <GrTransaction className="text-4xl text-white" />
          <p className={`${textCls}`}>Total Transactions</p>
          <p className="text-5xl font-semibold">0</p>
        </div>
        <div className={`${cmnCls}`}>
          <MdOutlineHardware className="text-4xl text-white" />
          <p className={`${textCls}`}>Total UTXOs</p>
          <p className="text-5xl font-semibold">0</p>
        </div>
      </div>
    </div>
  );
};

export default BlockchainStats;
