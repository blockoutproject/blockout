import React, { createContext, useContext } from "react";

import type { User } from "@/src/modules/session/auth/AuthProvider";
import type { AppStatusResponse } from "@/src/modules/app-status/model/AppStatus";
import type { UserResponse } from "@/src/modules/user/model/User";

export type SessionActions = {
  signIn: () => Promise<void>;
  continueAsGuest: () => void;
  leaveGuest: () => Promise<void>;
  signOutLocal: () => Promise<void>;
  signOutSSO: (opts?: { federated?: boolean }) => Promise<void>;
  softResetAuth: () => Promise<void>;
  bypassMaintenance: () => void;
  resetBypassMaintenance: () => void;
  bypassUpdate: () => void;
  resetBypassUpdate: () => void;
  refetch: () => Promise<void>;
  refetchAppStatus: () => Promise<void>;
};

export type SessionState = {
  auth0User: User | null;
  customUser: UserResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  error: Error | null;
  customUserError: Error | null;
  auth0UserError: Error | null;
  appStatus: AppStatusResponse | undefined;
  isAppStatusLoading: boolean;
  isAppStatusError: boolean;
  isMaintenance: boolean;
  maintenanceBypass: boolean;
  canBypassMaintenance: boolean;
  isUpdateRequired: boolean;
  updateBypass: boolean;
  canBypassUpdate: boolean;
  appUpdateUrl: string | null;
  isBootstrapped: boolean;
};

const SessionActionsContext = createContext<SessionActions | null>(null);
const SessionStateContext = createContext<SessionState | null>(null);

type SessionContextProviderProps = React.PropsWithChildren<{
  actions: SessionActions;
  state: SessionState;
}>;

export const SessionContextProvider: React.FC<SessionContextProviderProps> = ({
  actions,
  state,
  children,
}) => (
  <SessionActionsContext.Provider value={actions}>
    <SessionStateContext.Provider value={state}>
      {children}
    </SessionStateContext.Provider>
  </SessionActionsContext.Provider>
);

export const useSessionActions = () => {
  const actions = useContext(SessionActionsContext);
  if (!actions)
    throw new Error("useSessionActions must be used within <SessionProvider>");
  return actions;
};

export const useSessionState = () => {
  const state = useContext(SessionStateContext);
  if (!state)
    throw new Error("useSessionState must be used within <SessionProvider>");
  return state;
};
