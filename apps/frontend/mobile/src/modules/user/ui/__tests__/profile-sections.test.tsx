import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import ProfileAccountSection from "@/src/modules/user/ui/profile-account-section";
import ProfileLegalSection from "@/src/modules/user/ui/profile-legal-section";

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

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("profile sections", () => {
  it("keeps each legal destination explicit", async () => {
    const onOpenImprint = jest.fn();
    const onOpenTerms = jest.fn();
    const onOpenPrivacy = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <ProfileLegalSection
          onOpenImprint={onOpenImprint}
          onOpenTerms={onOpenTerms}
          onOpenPrivacy={onOpenPrivacy}
        />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "Mentions légales" }));
    await user.press(
      screen.getByRole("button", { name: "Conditions d'utilisation" }),
    );
    await user.press(
      screen.getByRole("button", { name: "Politique de confidentialité" }),
    );

    expect(onOpenImprint).toHaveBeenCalledTimes(1);
    expect(onOpenTerms).toHaveBeenCalledTimes(1);
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  it("exposes advertising privacy choices only when UMP requires them", async () => {
    const onOpenAdvertisingPrivacy = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <ProfileLegalSection
          onOpenImprint={jest.fn()}
          onOpenTerms={jest.fn()}
          onOpenPrivacy={jest.fn()}
          onOpenAdvertisingPrivacy={onOpenAdvertisingPrivacy}
        />
      </ThemeProvider>,
    );

    await user.press(
      screen.getByRole("button", {
        name: "Choix de confidentialité publicitaire",
      }),
    );

    expect(onOpenAdvertisingPrivacy).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <ThemeProvider>
        <ProfileLegalSection
          onOpenImprint={jest.fn()}
          onOpenTerms={jest.fn()}
          onOpenPrivacy={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(
      screen.queryByRole("button", {
        name: "Choix de confidentialité publicitaire",
      }),
    ).toBeNull();
  });

  it("keeps account commands explicit and disables both while busy", async () => {
    const onLogout = jest.fn();
    const onDeleteAccount = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <ProfileAccountSection
          busy
          isLoggingOut
          isDeleting={false}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
        />
      </ThemeProvider>,
    );

    const logout = screen.getByRole("button", { name: "Se déconnecter" });
    const deletion = screen.getByRole("button", {
      name: "Supprimer mon compte",
    });

    expect(logout.props.accessibilityState).toMatchObject({ disabled: true });
    expect(deletion.props.accessibilityState).toMatchObject({ disabled: true });

    await user.press(logout);
    await user.press(deletion);

    expect(onLogout).not.toHaveBeenCalled();
    expect(onDeleteAccount).not.toHaveBeenCalled();
  });
});
