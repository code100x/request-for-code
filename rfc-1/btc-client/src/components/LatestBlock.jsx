import { ArrowDownCircle, Clock, Hash, Database } from "lucide-react";
import { useBlockChainData } from "../contexts/BlockChainContext";

const LatestBlockComponent = () => {
  const { latestBlock } = useBlockChainData();

  if (!latestBlock) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      <h2 className="text-3xl font-bold mb-6 flex items-center">
        <Database className="mr-2" /> Latest Block
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2 bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <Hash className="mr-2" /> Block Hash
          </h3>
          <p className="text-sm break-all">{latestBlock.hash}</p>
        </div>
        <div className="col-span-2 bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <Hash className="mr-2" /> Prev Hash
          </h3>
          <p className="text-sm break-all">{latestBlock.previousHash}</p>
        </div>
        <div className="bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <Hash className="mr-2" /> Nonce
          </h3>
          <p className="text-2xl font-bold">{latestBlock.nonce}</p>
        </div>
        <div className="bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <ArrowDownCircle className="mr-2" /> Block Height
          </h3>
          <p className="text-2xl font-bold">{latestBlock.index}</p>
        </div>
        <div className="bg-white bg-opacity-20 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <Clock className="mr-2" /> Timestamp
          </h3>
          <p className="text-sm">
            {new Date(latestBlock.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="bg-white bg-opacity-20 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <Database className="mr-2" /> Transactions
          </h2>
          <p className="text-2xl font-bold">
            {latestBlock.transactions.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LatestBlockComponent;
