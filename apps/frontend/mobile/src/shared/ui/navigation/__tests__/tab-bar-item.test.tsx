import React from "react";
import { Text } from "react-native";
import { render, userEvent } from "@testing-library/react-native";
import type { SharedValue } from "react-native-reanimated";

import { TabBarItem } from "@/src/shared/ui/navigation/tab-bar-item";

jest.mock("react-native-reanimated", () => {
  const ReactNative = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: { View: ReactNative.View },
    useAnimatedStyle: (factory: () => object) => factory(),
    withSpring: (value: unknown) => value,
  };
});

describe("TabBarItem", () => {
  it("exposes the selected destination and invokes native tab navigation", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <TabBarItem
        options={{
          tabBarAccessibilityLabel: "Accueil",
          tabBarButtonTestID: "navigation-home-action",
          tabBarIcon: () => <Text>Home icon</Text>,
        }}
        index={0}
        isFocused
        color="#ffffff"
        size={26}
        activeIndex={{ value: 0 } as SharedValue<number>}
        onPress={onPress}
        onLongPress={jest.fn()}
        onLayout={jest.fn()}
      />,
    );

    const destination = screen.getByRole("tab", { name: "Accueil" });
    expect(destination).toBe(
      screen.getByTestId("navigation-home-action"),
    );
    expect(destination.props.accessibilityState).toEqual({ selected: true });

    await user.press(destination);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
