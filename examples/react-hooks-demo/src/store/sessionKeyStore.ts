import type { GrantPermissionMutateResponse } from "@cometh/connect-react-hooks";
import type { Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { create } from "zustand";

interface SessionKeyStore {
  permission: GrantPermissionMutateResponse | undefined;
  privateKey: Hex;
  reset: () => void;
  setPermission: (permission: GrantPermissionMutateResponse) => void;
}

const defaultState = {
  permission: undefined,
  privateKey: generatePrivateKey(),
};

export const sessionKeyStore = create<SessionKeyStore>((set, get) => ({
  ...defaultState,

  reset: () => set(defaultState),

  setPermission: (permission) => {
    set({ permission });
  },
}));
