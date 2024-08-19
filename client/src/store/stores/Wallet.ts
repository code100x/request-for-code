import type { StateCreator } from "zustand";

import type { AppState } from "../mainStore";

export interface IWalletState {
  wallet: IWallet | null;
  wsClient: WebSocket | null;
  transactions: ITransaction[];
  utxos: IUTXO[];
  walletBalance: number;
  myTransactions: ITx[];
  setWallet: (wallet: IWallet) => void;
  loadWallet: () => void;
  loadTransactions: () => void;
  initWsClient: () => void;
  listenEvents: () => void;
  sendEventRequest: () => void;
  blockStats: {
    totalBlocks: number;
    totalTransactions: number;
    totalWallets: number;
    difficulty: number;
  };
  allBlocks: IBlock[];
  isSocketConnected: boolean;
  allTransactions: ITx[];
  myTxCount: number;
}

export const initialWalletState = {
  wallet: null,
  wsClient: null,
  transactions: [],
  utxos: [],
  isSocketConnected: false,
  walletBalance: 0,
  allBlocks: [],
  blockStats: {
    totalBlocks: 0,
    totalTransactions: 0,
    totalWallets: 0,
    difficulty: 0,
  },
  myTransactions: [],
  myTxCount: 0,
  allTransactions: [],
};

export const createWalletSlice: StateCreator<AppState, [], [], IWalletState> = (
  set,
  get
) => ({
  ...initialWalletState,
  setWallet: (wallet) => {
    const { wsClient } = get();
    localStorage.setItem("BC-Wallet", JSON.stringify(wallet));
    set({ wallet });
    if (wsClient?.readyState === 1) {
      console.log("Sending get utxo set and balance request");
      wsClient.send(
        JSON.stringify({ type: "GET_UTXO_SET", address: wallet.publicKey })
      );
      wsClient.send(
        JSON.stringify({ type: "GET_BALANCE", address: wallet.publicKey })
      );
    }
  },
  loadWallet: () => {
    const wallet = localStorage.getItem("BC-Wallet");
    if (wallet) {
      set({ wallet: JSON.parse(wallet) });
    }
  },

  sendEventRequest: () => {
    const { wsClient, wallet } = get();

    if (wsClient?.readyState === 1 && wallet?.publicKey) {
      wsClient.send(
        JSON.stringify({ type: "GET_UTXO_SET", address: wallet.publicKey })
      );
      wsClient.send(
        JSON.stringify({ type: "GET_BALANCE", address: wallet.publicKey })
      );
      wsClient.send(
        JSON.stringify({
          type: "GET_USER_TRANSACTIONS",
          address: wallet.publicKey,
        })
      );
      wsClient.send(
        JSON.stringify({
          type: "GET_BLOCKCHAIN",
        })
      );
    }
  },
  loadTransactions: () => {
    const transactions = localStorage.getItem("BC-Transactions");
    if (transactions) {
      set({ transactions: JSON.parse(transactions) });
    }
  },
  initWsClient: () => {
    const WSClient = new WebSocket("ws://localhost:8080");
    WSClient.onopen = () => {
      console.log("Connected to WS server");
      if (WSClient.readyState === 1) {
        set({ isSocketConnected: true });
      }
    };
    set({ wsClient: WSClient });
  },
  listenEvents: () => {
    const { wsClient, wallet } = get();
    if (wsClient && wallet) {
      wsClient.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "UTXO_SET") {
          console.log("UTXO_SET", data);

          set({ utxos: data.utxoSet });
        }

        if (data.type === "BALANCE") {
          console.log("BALANCE", data);
          set({ walletBalance: data.balance });
        }

        if (data.type === "WALLET_CREATED") {
          console.log("Wallet created", data);
          wsClient.send(
            JSON.stringify({ type: "GET_UTXO_SET", address: data.address })
          );
          wsClient.send(
            JSON.stringify({ type: "GET_BALANCE", address: data.address })
          );
        }

        if (data.type === "NEW_TRANSACTION") {
          const { blockStats, allTransactions } = get();

          set({
            allTransactions: [data.transaction, ...allTransactions],
            blockStats: {
              ...blockStats,
              totalTransactions: data.totalTransactions,
            },
          });
        }
        if (data.type === "NEW_BLOCK") {
          const { blockStats, allBlocks } = get();
          set({
            allBlocks: [data.block, ...allBlocks],
            blockStats: {
              ...blockStats,
              totalBlocks: data.block.index + 1,
              difficulty: data.difficulty,
            },
          });
        }

        if (data.type === "BLOCKCHAIN") {
          console.log("Blockchain", data);
          set({
            allBlocks: data.blockchain,
            blockStats: {
              ...get().blockStats,
              totalBlocks: data.blockchain.length,
              totalWallets: data.totalWallets,
            },
          });
        }

        if (data.type === "BALANCE_UPDATE") {
          console.log("BALANCE_UPDATE", data);
          if (data.address === wallet.publicKey)
            set({ walletBalance: data.balance });
        }

        if (data.type === "USER_TRANSACTIONS") {
          set({ myTransactions: data.transactions, myTxCount: data.total });
        }
        if (data.type === "GLOBAL_TRANSACTIONS") {
          console.log("GLOBAL_TRANSACTIONS", data);
          set({
            allTransactions: data.transactions,
            blockStats: {
              ...get().blockStats,
              totalTransactions: data.total,
            },
          });
        }
      };

      wsClient.onclose = () => {
        console.log("Disconnected from WS server");
        set({ isSocketConnected: false });
      };
    }
  },
});
