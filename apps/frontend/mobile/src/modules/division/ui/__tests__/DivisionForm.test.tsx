import React from "react";
import {act, render, userEvent} from "@testing-library/react-native";
import {SafeAreaProvider} from "react-native-safe-area-context";

import {DivisionResponse} from "@/src/shared/generated/models";
import DivisionForm from "@/src/modules/division/ui/DivisionForm";
import {ThemeProvider} from "@/src/shared/providers/ThemeProvider";

const mockUpdateDivision = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const {ScrollView, TextInput} = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({
    mobile: {config: {updateDivision: mockUpdateDivision}},
  }),
}));

jest.mock("@/src/shared/ui/form/CircleColorPicker", () =>
  function MockCircleColorPicker() {
    return null;
  },
);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: {Medium: "medium"},
  NotificationFeedbackType: {Error: "error", Success: "success"},
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {manipulate: jest.fn()},
  SaveFormat: {JPEG: "jpeg"},
}));

jest.mock("expo-image", () => ({Image: "Image"}));

const division: DivisionResponse = {
  id: 7,
  name: "Nationale 2",
  mainColor: "#111111",
  firstGradientColor: "#222222",
  secondGradientColor: "#333333",
  thirdGradientColor: "#444444",
  logoUrl: "https://example.test/division.png",
  active: true,
  createdAt: "2026-07-01T10:00:00Z",
  lastUpdate: "2026-07-20T10:00:00Z",
};

describe("DivisionForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits the exact trimmed gateway request through the registered command", async () => {
    mockUpdateDivision.mockResolvedValue({...division, name: "Nationale 2 Elite"});
    const onSuccess = jest.fn();
    let submit: () => void = () => undefined;
    const user = userEvent.setup();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: {x: 0, y: 0, width: 390, height: 844},
          insets: {top: 0, right: 0, bottom: 0, left: 0},
        }}
      >
        <ThemeProvider>
          <DivisionForm
            division={division}
            onSuccess={onSuccess}
            onRegisterSubmit={(command) => {
              submit = command;
            }}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("division-form")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Choisir un logo de division"})).toBe(
      screen.getByTestId("division-logo-action"),
    );

    const nameInput = screen.getByLabelText("Nom de la division");
    await user.clear(nameInput);
    await user.type(nameInput, "  Nationale 2 Elite  ");
    await act(async () => submit());

    expect(mockUpdateDivision).toHaveBeenCalledWith(
      7,
      {
        name: "Nationale 2 Elite",
        mainColor: "#111111",
        firstGradientColor: "#222222",
        secondGradientColor: "#333333",
        thirdGradientColor: "#444444",
      },
      undefined,
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
