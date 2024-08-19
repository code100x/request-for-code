import { useAppStore } from "@/store";

const Block = () => {
  const { allBlocks } = useAppStore((state) => ({
    allBlocks: state.allBlocks,
  }));

  // sort blocks by index in descending order
  allBlocks.sort((a, b) => b.index - a.index);

  const blocks = allBlocks.slice(0, 6);

  if (blocks.length === 0) {
    return (
      <p className="text-2xl font-semibold text-center mt-8">
        No Blocks Found Yet
      </p>
    );
  }

  return (
    <div className="flex flex-col my-8">
      <p className="text-2xl font-semibold">BC-Chain Mined Blocks</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {blocks.map((block) => (
          <div
            key={block.index}
            className="bg-white/5 p-5 rounded-xl flex flex-col gap-8"
          >
            <div>
              <p className="text-5xl font-semibold">{block.index}</p>
              <p className="text-lg text-white/50 font-medium mt-1">
                Block Number
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{block.nonce}</p>
              <p className="text-lg text-white/50 font-medium mt-1">Nonce</p>
            </div>
            <div>
              <p className="text-xl font-semibold">
                {block.hash.substring(0, 24) + "..."}
              </p>
              <p className="text-lg text-white/50 font-medium mt-1">
                Block Hash
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold">
                {block.previousHash.substring(0, 24) + "..."}
              </p>
              <p className="text-lg text-white/50 font-medium mt-1">
                Block Prev Hash
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {block.transactions.length || 0}
              </p>
              <p className="text-lg text-white/50 font-medium mt-1">
                Transactions in Block
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {new Date(block.timestamp).toLocaleDateString()}
              </p>
              <p className="text-lg text-white/50 font-medium mt-1">
                Block Time
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Block;
