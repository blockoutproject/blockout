import { act, render, userEvent } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type {
  TeamDetailsResponse,
  TeamResponse,
} from "@/src/shared/generated/models";
import TeamForm from "@/src/modules/team/ui/TeamForm";
import { ThemeProvider } from "@/src/shared/providers/ThemeProvider";

const mockUpdateTeam = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { ScrollView, TextInput } = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({ mobile: { teams: { updateTeam: mockUpdateTeam } } }),
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

describe("TeamForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a trimmed update request through the team API", async () => {
    const team = {
      id: 12,
      name: "Ancien nom",
      shortName: "ANC",
      rawName: "Raw team name",
      logoUrl: "https://example.test/team.png",
    } as TeamResponse;
    const response = { id: 12, name: "Nouveau nom" } as TeamDetailsResponse;
    mockUpdateTeam.mockResolvedValue(response);
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
          <TeamForm
            team={team}
            onSuccess={onSuccess}
            onRegisterSubmit={(command) => {
              submit = command;
            }}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("team-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Changer le logo" })).toBe(
      screen.getByTestId("team-logo-change-action"),
    );

    const nameInput = screen.getByLabelText("Nom de l'équipe");
    const shortNameInput = screen.getByLabelText("Diminutif de l'équipe");
    await user.clear(nameInput);
    await user.type(nameInput, "  Nouveau nom  ");
    await user.clear(shortNameInput);
    await user.type(shortNameInput, "  NVO  ");
    await act(async () => submit());

    expect(mockUpdateTeam).toHaveBeenCalledWith(
      12,
      {
        name: "Nouveau nom",
        shortName: "NVO",
        logoUrl: "https://example.test/team.png",
      },
      undefined,
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
  });
});
