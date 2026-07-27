import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import FollowButton from "@/src/shared/ui/follow/follow-button";

const mockImpactAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: () => mockImpactAsync(),
}));

const gradient = ["#111111", "#222222"] as const;

describe("FollowButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, "Suivre", "Suivre"],
    [true, "Suivie", "Ne plus suivre"],
  ] as const)(
    "renders and invokes the %s follow state",
    async (isFollowing, label, accessibilityLabel) => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      const screen = await render(
        <ThemeProvider>
          <FollowButton
            isFollowing={isFollowing}
            onPress={onPress}
            gradient={gradient}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText(label)).toBeTruthy();
      await user.press(
        screen.getByRole("button", { name: accessibilityLabel }),
      );

      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps a disabled follow action non-interactive", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <FollowButton
          isFollowing={false}
          onPress={onPress}
          disabled
          gradient={gradient}
        />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", { name: "Suivre" });
    expect(action.props.accessibilityState).toEqual({ disabled: true });
    await user.press(action);

    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
