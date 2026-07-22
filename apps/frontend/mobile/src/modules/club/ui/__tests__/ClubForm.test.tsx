import { act, render, userEvent } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { ClubResponse } from "@/src/shared/generated/models";
import ClubForm from "@/src/modules/club/ui/ClubForm";
import { ThemeProvider } from "@/src/shared/providers/ThemeProvider";

const mockUpdateClub = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { ScrollView, TextInput } = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({ mobile: { clubs: { updateClub: mockUpdateClub } } }),
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
  SaveFormat: { PNG: "png" },
}));

jest.mock("expo-image", () => ({ Image: "Image" }));

describe("ClubForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a trimmed update request through the club API", async () => {
    const club = {
      id: "club-12",
      name: "Ancien nom",
      rawName: "Raw club name",
      logoUrl: "https://example.test/club.png",
    } as ClubResponse;
    const response = { id: "club-12", name: "Blockout Volley" } as ClubResponse;
    mockUpdateClub.mockResolvedValue(response);
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
          <ClubForm
            club={club}
            onSuccess={onSuccess}
            onRegisterSubmit={(command) => {
              submit = command;
            }}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("club-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Changer le logo" })).toBe(
      screen.getByTestId("club-logo-change-action"),
    );

    const nameInput = screen.getByLabelText("Nom du club");
    await user.clear(nameInput);
    await user.type(nameInput, "  Blockout Volley  ");
    await act(async () => submit());

    expect(mockUpdateClub).toHaveBeenCalledWith(
      "club-12",
      {
        name: "Blockout Volley",
        logoUrl: "https://example.test/club.png",
      },
      undefined,
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
  });
});
