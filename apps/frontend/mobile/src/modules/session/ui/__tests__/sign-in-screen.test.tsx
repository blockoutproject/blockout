import React from "react";
import { render, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SignInScreen from "@/src/modules/session/ui/sign-in-screen";
import {
  SessionActions,
  SessionContextProvider,
  SessionState,
} from "@/src/modules/session/providers/SessionContext";
import { ThemeProvider } from "@/src/shared/theme";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Error: "error" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-reanimated", () => {
  const ReactModule = require("react") as typeof React;

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: React.ComponentType) => Component,
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: unknown) => ReactModule.useRef({ value }).current,
    withSpring: (value: unknown) => value,
  };
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

const renderScreen = async (actions: SessionActions) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider>
        <SessionContextProvider actions={actions} state={sessionState}>
          <SignInScreen />
        </SessionContextProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe("SignInScreen", () => {
  it("starts authentication through the accessible sign-in action", async () => {
    const actions = createActions();
    const user = userEvent.setup();
    const screen = await renderScreen(actions);

    const action = screen.getByRole("button", { name: "Se connecter" });
    expect(action).toBe(screen.getByTestId("session-sign-in-action"));

    await user.press(action);

    expect(actions.signIn).toHaveBeenCalledTimes(1);
  });

  it("starts a guest session through the accessible guest action", async () => {
    const actions = createActions();
    const user = userEvent.setup();
    const screen = await renderScreen(actions);

    const action = screen.getByRole("button", {
      name: "Continuer en tant qu’invité",
    });
    expect(action).toBe(screen.getByTestId("session-guest-action"));

    await user.press(action);

    expect(actions.continueAsGuest).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable message when authentication fails", async () => {
    const actions = createActions();
    actions.signIn = jest
      .fn()
      .mockRejectedValue(new Error("provider unavailable"));
    const user = userEvent.setup();
    const screen = await renderScreen(actions);

    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getByText("Connexion impossible, réessaie.")).toBeTruthy();
  });
});
