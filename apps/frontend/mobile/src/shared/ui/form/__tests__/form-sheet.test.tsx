import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

import {
  FormSheet,
  useFormSheetBinding,
} from "@/src/shared/ui/form/form-sheet";

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

type BoundFormProps = {
  submit: () => void;
  loading: boolean;
  canSubmit: boolean;
};

function BoundForm({ submit, loading, canSubmit }: BoundFormProps) {
  useFormSheetBinding({ submit, loading, canSubmit });
  return <Text>Form body</Text>;
}

describe("FormSheet", () => {
  it("coordinates the feature submit command and footer state", async () => {
    const firstSubmit = jest.fn();
    const secondSubmit = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <FormSheet
        footerLabel="Enregistrer"
        footerActionTestID="form-submit-action"
      >
        <BoundForm submit={firstSubmit} loading={false} canSubmit={false} />
      </FormSheet>,
    );

    const action = screen.getByTestId("form-submit-action");
    expect(action.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await screen.rerender(
      <FormSheet
        footerLabel="Enregistrer"
        footerActionTestID="form-submit-action"
      >
        <BoundForm submit={secondSubmit} loading={false} canSubmit />
      </FormSheet>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("form-submit-action").props.accessibilityState,
      ).toEqual({
        disabled: false,
        busy: false,
      });
    });
    await user.press(screen.getByTestId("form-submit-action"));

    expect(firstSubmit).not.toHaveBeenCalled();
    expect(secondSubmit).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <FormSheet
        footerLabel="Enregistrer"
        footerActionTestID="form-submit-action"
      >
        <BoundForm submit={secondSubmit} loading canSubmit />
      </FormSheet>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("form-submit-action").props.accessibilityState,
      ).toEqual({
        disabled: true,
        busy: true,
      });
    });
  });
});
