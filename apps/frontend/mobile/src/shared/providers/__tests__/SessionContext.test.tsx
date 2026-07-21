import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  SessionActions,
  SessionContextProvider,
  SessionState,
  useSessionActions,
  useSessionState,
} from "@/src/shared/providers/SessionContext";

const createActions = (): SessionActions => ({
  signIn: jest.fn().mockResolvedValue(undefined),
  continueAsGuest: jest.fn(),
  leaveGuest: jest.fn().mockResolvedValue(undefined),
  signOutLocal: jest.fn().mockResolvedValue(undefined),
  signOutSSO: jest.fn().mockResolvedValue(undefined),
  softResetAuth: jest.fn().mockResolvedValue(undefined),
  bypassMaintenance: jest.fn(),
  resetBypassMaintenance: jest.fn(),
  bypassUpdate: jest.fn(),
  resetBypassUpdate: jest.fn(),
  refetch: jest.fn().mockResolvedValue(undefined),
  refetchAppStatus: jest.fn().mockResolvedValue(undefined),
});

const sessionState: SessionState = {
  auth0User: null,
  customUser: undefined,
  isLoading: false,
  isError: false,
  isAuthenticated: false,
  isGuest: false,
  error: null,
  customUserError: null,
  auth0UserError: null,
  appStatus: undefined,
  isAppStatusLoading: false,
  isAppStatusError: false,
  isMaintenance: false,
  maintenanceBypass: false,
  canBypassMaintenance: false,
  isUpdateRequired: false,
  updateBypass: false,
  canBypassUpdate: false,
  appUpdateUrl: null,
  isBootstrapped: true,
};

describe("session contexts", () => {
  it("does not invalidate action-only consumers when session state changes", async () => {
    const actions = createActions();
    let actionRenders = 0;
    let stateRenders = 0;

    const ActionConsumer = () => {
      useSessionActions();
      actionRenders += 1;
      return <Text>actions</Text>;
    };
    const StateConsumer = () => {
      const { isMaintenance } = useSessionState();
      stateRenders += 1;
      return <Text>{isMaintenance ? "maintenance" : "available"}</Text>;
    };
    const children = (
      <>
        <ActionConsumer />
        <StateConsumer />
      </>
    );

    const screen = await render(
      <SessionContextProvider actions={actions} state={sessionState}>
        {children}
      </SessionContextProvider>,
    );

    await screen.rerender(
      <SessionContextProvider
        actions={actions}
        state={{ ...sessionState, isMaintenance: true }}
      >
        {children}
      </SessionContextProvider>,
    );

    expect(actionRenders).toBe(1);
    expect(stateRenders).toBe(2);
    expect(screen.getByText("maintenance")).toBeTruthy();
  });
});
