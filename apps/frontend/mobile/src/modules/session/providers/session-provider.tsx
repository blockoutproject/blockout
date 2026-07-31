import React, { useMemo } from "react";

import { useAppAccessState } from "@/src/modules/app-status/hooks/use-app-access-state";
import { useSessionAuthentication } from "@/src/modules/session/hooks/use-session-authentication";
import {
  SessionActions,
  SessionContextProvider,
  SessionState,
} from "@/src/modules/session/providers/session-context";

export {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/session-context";
export type {
  SessionActions,
  SessionState,
} from "@/src/modules/session/providers/session-context";

export const SessionProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const appAccess = useAppAccessState();
  const authentication = useSessionAuthentication({
    onAuthenticatedSessionEnded: appAccess.actions.resetBypasses,
  });

  const actions = useMemo<SessionActions>(
    () => ({
      ...authentication.actions,
      bypassMaintenance: appAccess.actions.bypassMaintenance,
      resetBypassMaintenance: appAccess.actions.resetBypassMaintenance,
      bypassUpdate: appAccess.actions.bypassUpdate,
      resetBypassUpdate: appAccess.actions.resetBypassUpdate,
      refetchAppStatus: appAccess.actions.refetchAppStatus,
    }),
    [appAccess.actions, authentication.actions],
  );

  const state = useMemo<SessionState>(
    () => ({
      ...authentication.state,
      ...appAccess.state,
      isLoading:
        authentication.state.isLoading || appAccess.state.isAppStatusLoading,
      isError: authentication.state.isError || appAccess.state.isAppStatusError,
    }),
    [appAccess.state, authentication.state],
  );

  return (
    <SessionContextProvider actions={actions} state={state}>
      {children}
    </SessionContextProvider>
  );
};
