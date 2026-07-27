import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { ClubResponse } from "@/src/shared/generated/models";
import ClubForm from "@/src/modules/club/forms/club-form";
import { ThemeProvider } from "@/src/shared/theme";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";

const mockUpdateClub = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { ScrollView, TextInput } = require("react-native");
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock(
  "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-modal",
  () =>
    function MockBottomSheetCustomModal({
      children,
      footerComponent,
    }: {
      children: React.ReactNode;
      footerComponent?: (props: object) => React.ReactNode;
    }) {
      return (
        <>
          {children}
          {footerComponent?.({ animatedFooterPosition: {} })}
        </>
      );
    },
);

jest.mock(
  "@/src/shared/ui/form/bottom-sheet-form-footer",
  () =>
    function MockBottomSheetFormFooter({
      label,
      onPress,
      disabled,
      loading,
      actionTestID,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
      loading?: boolean;
      actionTestID?: string;
    }) {
      const { Pressable, Text } = require("react-native");
      const isDisabled = Boolean(disabled || loading);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
          disabled={isDisabled}
          onPress={onPress}
          testID={actionTestID}
        >
          <Text>{label}</Text>
        </Pressable>
      );
    },
);

jest.mock("@/src/shared/providers/api-provider", () => ({
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

const club = {
  id: "club-12",
  name: "Ancien nom",
  rawName: "Raw club name",
  logoUrl: "https://example.test/club.png",
} as ClubResponse;

const renderClubForm = (onSuccess = jest.fn()) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider>
        <FormSheet
          footerLabel="Enregistrer"
          footerActionTestID="club-form-submit-action"
        >
          <ClubForm club={club} onSuccess={onSuccess} />
        </FormSheet>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe("ClubForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a trimmed update request through the club API", async () => {
    const response = { id: "club-12", name: "Blockout Volley" } as ClubResponse;
    mockUpdateClub.mockResolvedValue(response);
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    const screen = await renderClubForm(onSuccess);

    expect(screen.getByTestId("club-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Changer le logo" })).toBe(
      screen.getByTestId("club-logo-change-action"),
    );

    const nameInput = screen.getByLabelText("Nom du club");
    await user.clear(nameInput);
    await user.type(nameInput, "  Blockout Volley  ");
    await user.press(screen.getByTestId("club-form-submit-action"));

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

  it("keeps image removal mapped inside the club request", async () => {
    mockUpdateClub.mockResolvedValue(club);
    const user = userEvent.setup();
    const screen = await renderClubForm();

    await user.press(screen.getByTestId("club-logo-remove-action"));
    await user.press(screen.getByTestId("club-form-submit-action"));

    expect(mockUpdateClub).toHaveBeenCalledWith(
      "club-12",
      {
        name: "Ancien nom",
        logoUrl: null,
      },
      undefined,
    );
  });

  it("surfaces a failed update and restores submit availability", async () => {
    mockUpdateClub.mockRejectedValue(new Error("request failed"));
    const user = userEvent.setup();
    const screen = await renderClubForm();

    await user.press(screen.getByTestId("club-form-submit-action"));

    await waitFor(() => {
      expect(screen.getByText("Sauvegarde impossible, réessaie.")).toBeTruthy();
      expect(
        screen.getByTestId("club-form-submit-action").props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
    });
  });
});
