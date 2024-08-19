import { createContext, useContext } from "react";
import useBlockChainHook from "../hooks/useBlockChainData"; // Path to your custom hook

const BlockChainContext = createContext();

export const BlockChainProvider = ({ children }) => {
  const {
    isInitialized,
    chainInfo,
    latestBlock,
    recentBlocks,
    latestTransactions,
    message,
    setMessage,
    updateDashboard,
  } = useBlockChainHook(); // Example API and interval

  return (
    <BlockChainContext.Provider
      value={{
        isInitialized,
        chainInfo,
        latestBlock,
        recentBlocks,
        latestTransactions,
        message,
        setMessage,
        updateDashboard,
      }}
    >
      {children}
    </BlockChainContext.Provider>
  );
};

export const useBlockChainData = () => {
  return useContext(BlockChainContext);
};
