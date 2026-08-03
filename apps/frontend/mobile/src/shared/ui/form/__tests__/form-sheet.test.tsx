import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

import {
  FormSheet,
  useFormSheetBinding,
} from "@/src/shared/ui/form/form-sheet";

jest.mock("@/src/shared/ui/bottom-sheet/bottom-sheet-custom-modal", () => {
  const React = require("react") as typeof import("react");
  const MockPortalContext = React.createContext<{
    node: React.ReactNode;
    setNode: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  } | null>(null);

  function MockPortalProvider({ children }: { children: React.ReactNode }) {
    const [node, setNode] = React.useState<React.ReactNode>(null);
    const value = React.useMemo(() => ({ node, setNode }), [node]);

    return (
      <MockPortalContext.Provider value={value}>
        {children}
      </MockPortalContext.Provider>
    );
  }

  function MockPortalHost() {
    return React.useContext(MockPortalContext)?.node ?? null;
  }

  function MockBottomSheetCustomModal({
    children,
    footerComponent,
  }: {
    children: React.ReactNode;
    footerComponent?: (props: object) => React.ReactNode;
  }) {
    const portal = React.useContext(MockPortalContext);
    const node = React.useMemo(
      () => (
        <>
          {children}
          {footerComponent?.({ animatedFooterPosition: {} })}
        </>
      ),
      [children, footerComponent],
    );

    if (!portal) {
      throw new Error("MockBottomSheetCustomModal requires MockPortalProvider");
    }

    const { setNode } = portal;

    React.useLayoutEffect(() => {
      setNode(node);

      return () => setNode(null);
    }, [node, setNode]);

    return null;
  }

  return {
    __esModule: true,
    default: MockBottomSheetCustomModal,
    MockPortalHost,
    MockPortalProvider,
  };
});

const { MockPortalHost, MockPortalProvider } = jest.requireMock(
  "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-modal",
) as {
  MockPortalHost: React.ComponentType;
  MockPortalProvider: React.ComponentType<{ children: React.ReactNode }>;
};

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
      <MockPortalProvider>
        <FormSheet
          footerLabel="Enregistrer"
          footerActionTestID="form-submit-action"
        >
          <BoundForm submit={firstSubmit} loading={false} canSubmit={false} />
        </FormSheet>
        <MockPortalHost />
      </MockPortalProvider>,
    );

    const action = screen.getByTestId("form-submit-action");
    expect(action.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await screen.rerender(
      <MockPortalProvider>
        <FormSheet
          footerLabel="Enregistrer"
          footerActionTestID="form-submit-action"
        >
          <BoundForm submit={secondSubmit} loading={false} canSubmit />
        </FormSheet>
        <MockPortalHost />
      </MockPortalProvider>,
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
      <MockPortalProvider>
        <FormSheet
          footerLabel="Enregistrer"
          footerActionTestID="form-submit-action"
        >
          <BoundForm submit={secondSubmit} loading canSubmit />
        </FormSheet>
        <MockPortalHost />
      </MockPortalProvider>,
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
