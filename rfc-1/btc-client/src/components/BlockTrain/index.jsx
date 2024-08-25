import Block from "./Block";
import { useBlockChainData } from "../../contexts/BlockChainContext";

const BlockTrain = () => {
  const { recentBlocks } = useBlockChainData();
  // Handler for mining action
  const handleMine = (index, nonce) => {
    console.log(`Mining block at index: ${index} with nonce: ${nonce}`);
    // Add your mining logic here
  };
  return (
    <div className="flex space-x-6 max-w-full overflow-x-auto p-4">
      {recentBlocks.map((block) => (
        <Block key={block.hash} block={block} onMine={handleMine} />
      ))}
    </div>
  );
};

export default BlockTrain;
