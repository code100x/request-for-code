/* eslint-disable react/prop-types */
import StatCard from "./StatCard";

const BlockchainDashboard = ({ chainInfo, latestTransactions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="text-center mt-8 text-indigo-500">
        Loading dashboard...
      </div>
    );
  }
  if (!chainInfo) {
    return (
      <div className="text-center mt-8 text-indigo-500">
        Unable to load blockchain information.
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-indigo-900 mb-6">
        Blockchain Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Blocks" value={chainInfo.totalBlocks} />
        <StatCard
          title="Total Confirmed Transactions"
          value={chainInfo.totalTransactions}
        />
        <StatCard
          title="Current Difficulty"
          value={chainInfo.currentDifficulty}
        />
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4 text-indigo-800">
          Pending Transactions
        </h3>
        <div className="overflow-x-auto bg-indigo-50 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-2 text-left text-indigo-700">From</th>
                <th className="px-4 py-2 text-left  text-indigo-700">To</th>
                <th className="px-4 py-2 text-left  text-indigo-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {latestTransactions.map((tx, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-indigo-50" : "bg-white"}
                >
                  <td className="border-t border-indigo-200 px-4 py-2 text-indigo-800">
                    {tx.fromAddress.substring(0, 10)}...
                  </td>
                  <td className="border-t border-indigo-200 px-4 py-2 text-indigo-800">
                    {tx.toAddress.substring(0, 10)}...
                  </td>
                  <td className="border-t border-indigo-200 px-4 py-2 text-indigo-800">
                    {tx.amount} BTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockchainDashboard;
