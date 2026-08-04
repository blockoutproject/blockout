import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import RawDivisionMappingForm from "@/src/modules/raw-division-mapping/forms/raw-division-mapping-form";
import type { RawDivisionMappingResponse } from "@/src/shared/generated/models";
import { ThemeProvider } from "@/src/shared/theme";
import { FormatEnum } from "@/src/shared/view-models/format-labels";
import { GenderEnum } from "@/src/shared/view-models/gender-labels";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockSelectionAsync = jest.fn().mockResolvedValue(undefined);
let mockDivisionsState = {
  data: [] as { id: number; name: string; active: boolean }[],
  isLoading: true,
};

jest.mock("@/src/modules/division/hooks/use-divisions", () => ({
  useDivisions: () => mockDivisionsState,
}));

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => ({
    mobile: {
      rawDivisionMappings: { updateRawDivisionMapping: jest.fn() },
    },
  }),
}));

jest.mock("@/src/shared/ui/feedback/api-error-toast", () => () => null);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: () => mockSelectionAsync(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactModule = require("react") as typeof React;
  const { ScrollView, View } = require("react-native");

  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetBackdrop: View,
    BottomSheetModal: ({
      children,
      ref,
    }: {
      children: React.ReactNode;
      ref?: React.Ref<unknown>;
    }) => {
      ReactModule.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));

      return ReactModule.createElement(View, null, children);
    },
    BottomSheetFlatList: ({
      data,
      keyExtractor,
      renderItem,
    }: {
      data: readonly { value: string | number; label: string }[];
      keyExtractor: (item: { value: string | number; label: string }) => string;
      renderItem: (input: {
        item: { value: string | number; label: string };
      }) => React.ReactNode;
    }) =>
      ReactModule.createElement(
        View,
        null,
        data.map((item) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: keyExtractor(item) },
            renderItem({ item }),
          ),
        ),
      ),
  };
});

const mapping = {
  id: 19,
  rawDivisionName: "Nationale 2 féminine",
  leagueCode: "FFVB",
  season: "2025/2026",
  divisionId: 7,
  format: FormatEnum.SIX,
  gender: GenderEnum.F,
} as RawDivisionMappingResponse;

function renderForm() {
  return render(
    <ThemeProvider>
      <RawDivisionMappingForm
        mapping={mapping}
        onSuccess={jest.fn()}
        onRegisterSubmit={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe("RawDivisionMappingForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDivisionsState = { data: [], isLoading: true };
  });

  it("uses the canonical accessible select control for every raw mapping value", async () => {
    const screen = await renderForm();

    const format = screen.getByRole("button", {
      name: "Choisir un format",
    });
    const gender = screen.getByRole("button", {
      name: "Choisir un genre",
    });
    const division = screen.getByRole("button", {
      name: "Choisir une division",
    });

    expect(format.props.accessibilityValue).toEqual({ text: "6x6" });
    expect(format.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(gender.props.accessibilityValue).toEqual({ text: "Féminin" });
    expect(gender.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(division.props.accessibilityValue).toEqual({ text: "Division" });
    expect(division.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    mockDivisionsState = {
      data: [{ id: 7, name: "Nationale 2", active: true }],
      isLoading: false,
    };
    await screen.rerender(
      <ThemeProvider>
        <RawDivisionMappingForm
          mapping={mapping}
          onSuccess={jest.fn()}
          onRegisterSubmit={jest.fn()}
        />
      </ThemeProvider>,
    );

    const loadedDivision = screen.getByRole("button", {
      name: "Choisir une division",
    });
    expect(loadedDivision.props.accessibilityValue).toEqual({
      text: "Nationale 2",
    });
    expect(loadedDivision.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
  });

  it("preserves selection, clearing, haptics, and sheet dismissal", async () => {
    mockDivisionsState = {
      data: [{ id: 7, name: "Nationale 2", active: true }],
      isLoading: false,
    };
    const user = userEvent.setup();
    const screen = await renderForm();

    await user.press(screen.getByRole("button", { name: "Choisir un format" }));
    await user.press(screen.getByRole("button", { name: "4x4" }));

    expect(
      screen.getByRole("button", { name: "Choisir un format" }).props
        .accessibilityValue,
    ).toEqual({ text: "4x4" });

    await user.press(
      screen.getAllByRole("button", { name: "Réinitialiser" })[0],
    );

    expect(
      screen.getByRole("button", { name: "Choisir un format" }).props
        .accessibilityValue,
    ).toEqual({ text: "Format" });
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledTimes(2);
    expect(mockSelectionAsync).toHaveBeenCalledTimes(3);
  });
});
