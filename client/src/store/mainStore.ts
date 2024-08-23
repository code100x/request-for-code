import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

import {
  // Login
  IWalletState,
  initialWalletState,
  createWalletSlice,
} from "./stores";

export type AppState = IWalletState;

export const initialState = {
  ...initialWalletState,
};

/**
 * Create a combined store
 * which includes all the slices
 */
export const useAppStore = createWithEqualityFn<AppState>()(
  (...a) => ({
    ...createWalletSlice(...a),
  }),
  shallow
);
