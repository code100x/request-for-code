import type { StateCreator } from "zustand";

import type { AppState } from "../mainStore";

export interface IWalletState {
  wallet: IWallet | null;
  wsClient: WebSocket | null;
  transactions: ITransaction[];
  utxos: IUTXO[];
  walletBalance: number;
  setWallet: (wallet: IWallet) => void;
  loadWallet: () => void;
  loadTransactions: () => void;
  initWsClient: () => void;
  listenEvents: () => void;
  sendEventRequest: () => void;
  allBlocks: IBlock[];
  isSocketConnected: boolean;
}

export const initialWalletState = {
  wallet: null,
  wsClient: null,
  transactions: [],
  utxos: [],
  isSocketConnected: false,
  walletBalance: 0,
  allBlocks: [],
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
    console.log(
      "Sending get utxo set and balance request",
      wsClient?.readyState
    );
    if (wsClient?.readyState === 1 && wallet?.publicKey) {
      wsClient.send(
        JSON.stringify({ type: "GET_UTXO_SET", address: wallet.publicKey })
      );
      wsClient.send(
        JSON.stringify({ type: "GET_BALANCE", address: wallet.publicKey })
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
          console.log("New transaction", data);
        }
        if (data.type === "NEW_BLOCK") {
          console.log("New block", data);
        }

        if (data.type === "BLOCKCHAIN") {
          console.log("Blockchain", data);
        }
      };

      wsClient.onclose = () => {
        console.log("Disconnected from WS server");
        set({ isSocketConnected: false });
      };
    }
  },
});
