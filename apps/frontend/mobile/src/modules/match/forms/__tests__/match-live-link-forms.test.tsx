import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import MatchLiveLinkDeleteForm from "@/src/modules/match/forms/match-live-link-delete-form";
import MatchLiveLinkForm from "@/src/modules/match/forms/match-live-link-form";
import MatchLiveLinkReportForm from "@/src/modules/match/forms/match-live-link-report-form";
import { ThemeProvider } from "@/src/shared/theme";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";

const mockDeleteMatchLiveLink = jest.fn();
const mockReportMatchLiveLink = jest.fn();
const mockUpsertMatchLiveLink = jest.fn();

function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

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
      actionTestID,
      disabled,
      label,
      loading,
      onPress,
    }: {
      actionTestID?: string;
      disabled?: boolean;
      label: string;
      loading?: boolean;
      onPress: () => void;
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
  useApis: () => ({
    mobile: {
      matches: {
        deleteMatchLiveLink: mockDeleteMatchLiveLink,
        reportMatchLiveLink: mockReportMatchLiveLink,
        upsertMatchLiveLink: mockUpsertMatchLiveLink,
      },
    },
  }),
}));

jest.mock("@/src/modules/user/hooks/use-has-scopes", () => ({
  __esModule: true,
  default: () => ({ allowed: false }),
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error", Success: "success" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("match live-link forms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteMatchLiveLink.mockResolvedValue(undefined);
    mockReportMatchLiveLink.mockResolvedValue(undefined);
    mockUpsertMatchLiveLink.mockResolvedValue(undefined);
  });

  it("submits a trimmed live-link command through the shared form sheet", async () => {
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <TestProviders>
        <FormSheet
          footerLabel="Ajouter"
          footerActionTestID="live-link-submit-action"
        >
          <MatchLiveLinkForm
            matchId={17}
            isMatchFinished={false}
            onSuccess={onSuccess}
          />
        </FormSheet>
      </TestProviders>,
    );

    await user.type(
      screen.getByPlaceholderText("https://youtube.com/…"),
      "  https://youtube.com/watch?v=blockout  ",
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("live-link-submit-action").props.accessibilityState,
      ).toEqual({ disabled: false, busy: false });
    });
    await user.press(screen.getByTestId("live-link-submit-action"));

    expect(mockUpsertMatchLiveLink).toHaveBeenCalledWith(17, {
      url: "https://youtube.com/watch?v=blockout",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("keeps pre-window submission locked for a non-moderator", async () => {
    const screen = await render(
      <TestProviders>
        <FormSheet
          footerLabel="Ajouter"
          footerActionTestID="live-link-submit-action"
        >
          <MatchLiveLinkForm
            matchId={17}
            isBeforeLiveWindow
            isMatchFinished={false}
            onSuccess={jest.fn()}
          />
        </FormSheet>
      </TestProviders>,
    );

    expect(
      screen.getByText(
        "Tu pourras ajouter ou modifier le lien à partir d’une heure avant le début du match.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByTestId("live-link-submit-action").props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(mockUpsertMatchLiveLink).not.toHaveBeenCalled();
  });

  it("preserves the delete command payload", async () => {
    const user = userEvent.setup();
    const deleteSuccess = jest.fn();
    const deleteScreen = await render(
      <TestProviders>
        <FormSheet
          footerLabel="Supprimer"
          footerActionTestID="delete-live-link-action"
        >
          <MatchLiveLinkDeleteForm
            matchId={23}
            liveUrl="https://example.com/live"
            onSuccess={deleteSuccess}
          />
        </FormSheet>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(
        deleteScreen.getByTestId("delete-live-link-action").props
          .accessibilityState,
      ).toEqual({ disabled: false, busy: false });
    });
    await user.press(deleteScreen.getByTestId("delete-live-link-action"));
    expect(mockDeleteMatchLiveLink).toHaveBeenCalledWith(23);
    expect(deleteSuccess).toHaveBeenCalledTimes(1);
  });

  it("preserves the report command payload", async () => {
    const user = userEvent.setup();
    const reportSuccess = jest.fn();
    const reportScreen = await render(
      <TestProviders>
        <FormSheet
          footerLabel="Signaler"
          footerActionTestID="report-live-link-action"
        >
          <MatchLiveLinkReportForm matchId={29} onSuccess={reportSuccess} />
        </FormSheet>
      </TestProviders>,
    );

    await user.type(
      reportScreen.getByPlaceholderText(
        "Explique pourquoi ce lien est incorrect, inapproprié ou ne correspond pas à ce match…",
      ),
      "  Ce lien ne correspond pas au match.  ",
    );
    await waitFor(() => {
      expect(
        reportScreen.getByTestId("report-live-link-action").props
          .accessibilityState,
      ).toEqual({ disabled: false, busy: false });
    });
    await user.press(reportScreen.getByTestId("report-live-link-action"));

    expect(mockReportMatchLiveLink).toHaveBeenCalledWith(29, {
      reason: "Ce lien ne correspond pas au match.",
    });
    expect(reportSuccess).toHaveBeenCalledTimes(1);
  });
});
