import { useState, useEffect, useRef, useCallback } from "react";
import { BlockchainService } from "../lib/helpers/blockChain";
import { MAIN_SERVER } from "../../config.js";

const useBlockchainData = () => {
  const [blockchainService, setBlockchainService] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chainInfo, setChainInfo] = useState(null);
  const [latestBlock, setLatestBlock] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [latestTransactions, setLatestTransactions] = useState([]);
  const [message, setMessage] = useState("");

  const intervalRef = useRef(null);

  const updateDashboard = useCallback(async (service) => {
    try {
      setChainInfo(await service.getChainInfo());
      setLatestBlock(await service.getLatestBlock());
      setRecentBlocks(await service.getRecentBlocks());
      setLatestTransactions(await service.getTransactionPool());
    } catch (error) {
      console.error("Error updating dashboard:", error);
      setMessage(`Error updating dashboard: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const newBlockchainService = new BlockchainService(MAIN_SERVER);
        setBlockchainService(newBlockchainService);
        setIsInitialized(true);
        await updateDashboard(newBlockchainService);
      } catch (error) {
        console.error("Error initializing blockchain service:", error);
        setMessage(`Error: ${error.message}`);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!blockchainService) return;

    // Clear any existing interval before setting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up the new interval
    intervalRef.current = setInterval(() => {
      updateDashboard(blockchainService);
    }, 5000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [blockchainService, updateDashboard]);

  return {
    isInitialized,
    chainInfo,
    latestBlock,
    recentBlocks,
    latestTransactions,
    message,
    setMessage,
    updateDashboard: () =>
      blockchainService && updateDashboard(blockchainService),
  };
};

export default useBlockchainData;
