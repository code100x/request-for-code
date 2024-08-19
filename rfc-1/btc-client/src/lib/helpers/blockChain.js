// blockchainService.js
import axios from "axios";

export class BlockchainService {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
  }

  async getChainInfo() {
    const response = await fetch(`${this.serverUrl}/chain-info`);
    if (!response.ok) {
      throw new Error("Failed to fetch chain info");
    }
    return await response.json();
  }

  async getLatestBlock() {
    const response = await fetch(`${this.serverUrl}/api/latest-block`);
    if (!response.ok) {
      throw new Error("Failed to fetch latest block");
    }
    return await response.json();
  }

  async getRecentBlocks() {
    const response = await fetch(`${this.serverUrl}/api/last-n-blocks`);
    if (!response.ok) {
      throw new Error("Failed to fetch recent blocks");
    }
    return await response.json();
  }

  async getTransactionPool() {
    const response = await fetch(`${this.serverUrl}/api/transaction-pool`);
    if (!response.ok) {
      throw new Error("Failed to fetch recent blocks");
    }
    return await response.json();
  }

  async createTransaction(transaction, signature) {
    const signedTransaction = {
      ...transaction,
      signature: signature,
    };

    try {
      const response = await axios.post(
        `${this.serverUrl}/transaction`,
        signedTransaction
      );
      return response.data;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }
}
