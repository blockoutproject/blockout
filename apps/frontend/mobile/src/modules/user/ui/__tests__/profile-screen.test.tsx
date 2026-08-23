import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import ProfileScreen from "@/src/modules/user/ui/profile-screen";

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockResetOnboarding = jest.fn();
const mockDeleteCurrentUser = jest.fn().mockResolvedValue(undefined);

jest.mock("@/src/modules/session/providers/session-context", () => ({
  useSessionActions: () => ({ refetch: jest.fn(), signOutSSO: mockSignOut }),
  useSessionState: () => ({ customUser: { id: 7 }, isGuest: false }),
}));

jest.mock("@/src/modules/onboarding/model/onboarding-store", () => ({
  useOnboardingStore: () => ({ resetOnboarding: mockResetOnboarding }),
}));

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => ({
    mobile: { users: { deleteCurrentUser: mockDeleteCurrentUser } },
  }),
}));

jest.mock("@/src/modules/user/hooks/use-has-scopes", () => () => ({
  allowed: false,
}));

jest.mock("@/src/shared/theme", () => ({
  layout: { bottomNavigation: 0, sectionSeparator: 0 },
  spacing: { 2: 8, 5: 20 },
  useAppTheme: () => ({ background: "black" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/src/modules/advertising/providers/advertising-provider", () => ({
  useAdvertising: () => ({
    privacyOptionsRequired: false,
    showPrivacyOptions: jest.fn(),
  }),
}));

jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: {
    Warning: "warning",
    Success: "success",
    Error: "error",
  },
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock(
  "@/src/modules/user/ui/profile-account-section",
  () =>
    function ProfileAccountSection(props: {
      onLogout: () => void;
      onDeleteAccount: () => void;
    }) {
      const ReactModule = require("react") as typeof React;
      const ReactNative = require("react-native");
      return ReactModule.createElement(
        ReactNative.View,
        null,
        ReactModule.createElement(
          ReactNative.Pressable,
          { accessibilityRole: "button", onPress: props.onLogout },
          ReactModule.createElement(ReactNative.Text, null, "Se déconnecter"),
        ),
        ReactModule.createElement(
          ReactNative.Pressable,
          { accessibilityRole: "button", onPress: props.onDeleteAccount },
          ReactModule.createElement(
            ReactNative.Text,
            null,
            "Supprimer mon compte",
          ),
        ),
      );
    },
);

jest.mock("@/src/modules/user/ui/profile-hero", () => () => null);
jest.mock("@/src/modules/user/ui/profile-header", () => () => null);
jest.mock("@/src/modules/user/ui/profile-legal-section", () => () => null);
jest.mock("@/src/modules/user/ui/profile-legal-sheets", () => () => null);
jest.mock("@/src/modules/user/ui/profile-version", () => () => null);
jest.mock("@/src/modules/session/ui/guest-upsell-card", () => () => null);
jest.mock("@/src/modules/user/ui/profile-form-sheet", () => {
  const ReactModule = require("react") as typeof React;
  return { __esModule: true, default: ReactModule.forwardRef(() => null) };
});
jest.mock("@/src/modules/report/ui/report-form-sheet", () => {
  const ReactModule = require("react") as typeof React;
  return { __esModule: true, default: ReactModule.forwardRef(() => null) };
});

describe("ProfileScreen session cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("preserves onboarding on logout but resets it after account deletion", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    const screen = await render(<ProfileScreen />);

    await user.press(screen.getByRole("button", { name: "Se déconnecter" }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockResetOnboarding).not.toHaveBeenCalled();

    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );
    const buttons = alert.mock.calls[0][2];
    const confirm = buttons?.find((button) => button.style === "destructive");

    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(mockDeleteCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockResetOnboarding).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });
});
