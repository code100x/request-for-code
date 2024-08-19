import BlockchainDashboard from "./BlockChainDashBoard/DashBoard";

import LatestBlockComponent from "./LatestBlock";
import BitcoinWalletComponent from "./BitcoinWalletComponent";

import BlockTrain from "./BlockTrain";
import { useBlockChainData } from "../contexts/BlockChainContext";

const WalletAndDashboard = () => {
  const { isInitialized, chainInfo, latestTransactions } = useBlockChainData();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-indigo-600 text-lg font-semibold">
          Initializing wallet and dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <BlockTrain />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <BitcoinWalletComponent />
          </div>
          <div className="lg:col-span-1">
            {/* <RecentBlocksPreview /> */}
            <BlockchainDashboard
              chainInfo={chainInfo}
              latestTransactions={latestTransactions}
              isLoading={!isInitialized}
            />
          </div>
        </div>
        <LatestBlockComponent />
      </div>
    </div>
  );
};

export default WalletAndDashboard;
