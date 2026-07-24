import React from "react";
import { Linking } from "react-native";
import { render, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import MaintenanceScreen from "@/src/modules/app-status/ui/maintenance-screen";
import UpdateRequiredScreen from "@/src/modules/app-status/ui/update-required-screen";
import {
  SessionActions,
  SessionContextProvider,
  SessionState,
} from "@/src/modules/session/providers/session-context";
import { ThemeProvider } from "@/src/shared/theme";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
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

jest.mock("expo-image", () => ({ Image: "Image" }));

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
  appStatus: {
    maintenance: true,
    message: "Maintenance planifiée",
    imageUrl: null,
    lastUpdate: "2026-07-21T10:00:00Z",
    minVersionIos: "2.0.0",
    minVersionAndroid: "2.0.0",
    storeUrlIos: "https://apps.apple.com/app/blockout",
    storeUrlAndroid: "https://play.google.com/store/apps/blockout",
    forceUpdateMessage: "Mise à jour nécessaire",
  },
  isAppStatusLoading: false,
  isAppStatusError: false,
  isMaintenance: true,
  maintenanceBypass: false,
  canBypassMaintenance: true,
  isUpdateRequired: true,
  updateBypass: false,
  canBypassUpdate: true,
  appUpdateUrl: "https://apps.apple.com/app/blockout",
  isBootstrapped: true,
};

const renderScreen = async (
  children: React.ReactNode,
  actions: SessionActions,
) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider>
        <SessionContextProvider actions={actions} state={sessionState}>
          {children}
        </SessionContextProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe("application status screens", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("retries status loading and exposes the authorized maintenance bypass", async () => {
    const actions = createActions();
    const user = userEvent.setup();
    const screen = await renderScreen(<MaintenanceScreen />, actions);

    expect(screen.getByTestId("maintenance-screen")).toBeTruthy();
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await user.press(
      screen.getByRole("button", { name: "Accéder à l’application" }),
    );

    expect(actions.refetchAppStatus).toHaveBeenCalledTimes(1);
    expect(actions.bypassMaintenance).toHaveBeenCalledTimes(1);
  });

  it("opens the configured store and exposes the authorized update bypass", async () => {
    const actions = createActions();
    const canOpenUrl = jest
      .spyOn(Linking, "canOpenURL")
      .mockResolvedValue(true);
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const user = userEvent.setup();
    const screen = await renderScreen(<UpdateRequiredScreen />, actions);

    expect(screen.getByTestId("update-required-screen")).toBeTruthy();
    await user.press(
      screen.getByRole("button", { name: "Mettre à jour l’application" }),
    );
    await user.press(
      screen.getByRole("button", { name: "Accéder à l’application" }),
    );

    expect(canOpenUrl).toHaveBeenCalledWith(
      "https://apps.apple.com/app/blockout",
    );
    expect(openUrl).toHaveBeenCalledWith("https://apps.apple.com/app/blockout");
    expect(actions.bypassUpdate).toHaveBeenCalledTimes(1);
  });
});
