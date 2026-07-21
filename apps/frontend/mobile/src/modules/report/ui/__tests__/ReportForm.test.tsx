import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ReportType } from "@/src/modules/report/model/Report";
import ReportForm from "@/src/modules/report/ui/ReportForm";
import { ThemeProvider } from "@/src/shared/providers/ThemeProvider";

const mockCreateReport = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { ScrollView, TextInput } = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({
    mobile: { reports: { createReport: mockCreateReport } },
  }),
}));

jest.mock("@/src/shared/providers/SessionProvider", () => ({
  useSessionState: () => ({ customUser: { id: 7, pseudo: "Blockout" } }),
}));

jest.mock("expo-device", () => ({
  modelName: "Test Device",
  osName: "iOS",
  osVersion: "18.0",
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-image", () => ({ Image: "Image" }));

describe("ReportForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits the validated gateway request through the registered command", async () => {
    const response = {
      id: 4,
      number: 52,
      htmlUrl: "https://example.test/report/52",
      title: "Score incorrect",
      state: "OPEN",
    };
    mockCreateReport.mockResolvedValue(response);
    const onSuccess = jest.fn();
    const onStateChange = jest.fn();
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
          <ReportForm
            context={{ screen: "Match", userId: "42" }}
            onSuccess={onSuccess}
            onRegisterSubmit={(command) => {
              submit = command;
            }}
            onStateChange={onStateChange}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("report-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajouter une capture" })).toBe(
      screen.getByTestId("report-add-image-action"),
    );

    await user.type(screen.getByLabelText("Titre"), "  Score incorrect  ");
    await user.type(
      screen.getByLabelText("Description"),
      "  Le score affiché ne correspond pas.  ",
    );

    await waitFor(() => {
      expect(onStateChange).toHaveBeenLastCalledWith({
        loading: false,
        canSubmit: true,
      });
    });

    await act(async () => submit());

    expect(mockCreateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ReportType.DISPLAY_BUG,
        title: "Score incorrect",
        description: "Le score affiché ne correspond pas.",
        userId: "42",
        userName: "Blockout",
        screen: "Match",
        deviceModel: "Test Device",
        os: "iOS 18.0",
      }),
      [],
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
  });
});
