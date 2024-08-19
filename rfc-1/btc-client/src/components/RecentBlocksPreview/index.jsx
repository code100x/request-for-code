import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Layers, Clock, Hash, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useBlockChainData } from "../../contexts/BlockChainContext";

const RecentBlocks = () => {
  const { recentBlocks } = useBlockChainData();

  if (!recentBlocks) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const chartData = recentBlocks.map((block) => ({
    height: block.index,
    transactions: block.transactions.length,
  }));

  return (
    <Card className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold flex items-center">
          <Layers className="mr-2" /> Last 5 Blocks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="height" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(79, 70, 229, 0.8)",
                  border: "none",
                  borderRadius: "4px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="transactions" fill="#4ade80" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          {recentBlocks.map((block) => (
            <Card
              key={block.hash}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold flex items-center">
                    <Database className="mr-2" /> Block {block.index}
                  </span>
                  <span className="text-sm flex items-center">
                    <Clock className="mr-1" />
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm truncate flex items-center">
                  <Hash className="mr-1 flex-shrink-0" />

                  <span className="truncate">{block.hash}</span>
                </div>
                <div className="mt-2 text-right font-semibold">
                  Transactions: {block.transactions.length}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentBlocks;
