import type { StateCreator } from "zustand";

import type { AppState } from "../mainStore";

export interface IWalletState {
  wallet: IWallet | null;
  setWallet: (wallet: IWallet) => void;
  loadWallet: () => void;
}

export const initialWalletState = {
  wallet: null,
};

export const createWalletSlice: StateCreator<AppState, [], [], IWalletState> = (
  set
) => ({
  ...initialWalletState,
  setWallet: (wallet) => {
    localStorage.setItem("BC-Wallet", JSON.stringify(wallet));
    set({ wallet });
  },
  loadWallet: () => {
    const wallet = localStorage.getItem("BC-Wallet");
    if (wallet) {
      set({ wallet: JSON.parse(wallet) });
    }
  },
});
