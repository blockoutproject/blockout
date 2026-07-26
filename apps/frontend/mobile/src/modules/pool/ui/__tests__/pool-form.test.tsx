import { act, render, userEvent } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type {
  PoolDetailsResponse,
  PoolResponse,
} from "@/src/shared/generated/models";
import PoolForm from "@/src/modules/pool/ui/pool-form";
import { ThemeProvider } from "@/src/shared/theme";

const mockUpdatePool = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { ScrollView, TextInput } = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => ({ mobile: { pools: { updatePool: mockUpdatePool } } }),
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("PoolForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a trimmed update request through the pool API", async () => {
    const pool = {
      id: 24,
      name: "Ancien nom",
      shortName: "ANC",
      rawName: "Raw pool name",
    } as PoolResponse;
    const response = {
      id: 24,
      name: "Poule principale",
    } as PoolDetailsResponse;
    mockUpdatePool.mockResolvedValue(response);
    const onSuccess = jest.fn();
    let submit: () => void = () => undefined;
    const user = userEvent.setup();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <ThemeProvider>
          <PoolForm
            pool={pool}
            onSuccess={onSuccess}
            onRegisterSubmit={(command) => {
              submit = command;
            }}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("pool-form")).toBeTruthy();
    expect(screen.getByTestId("pool-name-input")).toBe(
      screen.getByLabelText("Nom de la poule"),
    );

    const nameInput = screen.getByLabelText("Nom de la poule");
    const shortNameInput = screen.getByLabelText("Diminutif de la poule");
    await user.clear(nameInput);
    await user.type(nameInput, "  Poule principale  ");
    await user.clear(shortNameInput);
    await user.type(shortNameInput, "  PP  ");
    await act(async () => submit());

    expect(mockUpdatePool).toHaveBeenCalledWith(24, {
      name: "Poule principale",
      shortName: "PP",
    });
    expect(onSuccess).toHaveBeenCalledWith(response);
  });
});
