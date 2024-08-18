import type { StateCreator } from "zustand";

import type { AppState } from "../mainStore";

export interface IWalletState {
  wallet: IWallet | null;
}

export const initialWalletState = {
  wallet: null,
};

export const createWalletSlice: StateCreator<AppState, [], [], IWalletState> = (
  set
) => ({
  ...initialWalletState,
});
