import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Pressable,
  Text,
  type ViewProps,
} from "react-native";
import {
  ReduceMotion,
  withTiming,
  type EntryAnimationsValues,
} from "react-native-reanimated";
import { ActionFeedbackProvider, useActionFeedback } from "../action-feedback";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { TECHNICAL_ERROR } from "../error-copy";

const SAVED_MESSAGE = "Modifications enregistrées";

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  const { useLayoutEffect, useState } =
    jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual("react-native");
  const layout: EntryAnimationsValues = {
    targetOriginX: 0,
    targetOriginY: 0,
    targetGlobalOriginX: 0,
    targetGlobalOriginY: 0,
    targetWidth: 360,
    targetHeight: 64,
    targetBorderRadius: 0,
    windowWidth: 393,
    windowHeight: 852,
  };

  /** Jest does not run native layout animations. Deliver the initial entry request at mount. */
  function LayoutAnimationView({
    entering,
    exiting: _exiting,
    ...props
  }: Readonly<
    ViewProps & {
      entering?: (values: EntryAnimationsValues) => unknown;
      exiting?: unknown;
    }
  >) {
    const [enterOnMount] = useState(() => entering);
    useLayoutEffect(() => {
      enterOnMount?.(layout);
    }, [enterOnMount]);
    return <View {...props} />;
  }

  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, View: LayoutAnimationView },
    withTiming: jest.fn(),
  };
});

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** Exercises actual presentation events; the optional promise controls only the remote write boundary. */
function Actions({
  response,
  retainOnUnmount,
}: Readonly<{
  response?: Promise<void>;
  retainOnUnmount?: boolean;
}>) {
  const feedback = useActionFeedback({ retainOnUnmount });
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Technical failure"
        onPress={() => {
          if (response) {
            void response.catch(() => feedback.error());
          } else {
            feedback.error();
          }
        }}
      >
        <Text>Technical failure</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Functional failure"
        onPress={() => feedback.error("Cette action est indisponible.")}
      >
        <Text>Functional failure</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (response) {
            void response.then(
              () => feedback.success(SAVED_MESSAGE),
              () => feedback.error(),
            );
          } else {
            feedback.success(SAVED_MESSAGE);
          }
        }}
      >
        <Text>Save</Text>
      </Pressable>
    </>
  );
}

/** The ordinary providers remain real; the scope models the root's session presentation boundary. */
function Surface({
  scope = "original",
  showActions = true,
  response,
  retainOnUnmount,
}: Readonly<{
  scope?: string;
  showActions?: boolean;
  response?: Promise<void>;
  retainOnUnmount?: boolean;
}>) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey={scope}>
        {showActions && (
          <Actions response={response} retainOnUnmount={retainOnUnmount} />
        )}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

it.each([
  {
    reducedMotion: false,
    entryTimings: [
      expect.objectContaining({
        duration: 240,
        reduceMotion: ReduceMotion.Never,
      }),
    ],
  },
  { reducedMotion: true, entryTimings: [] },
])(
  "applies resolved reduced motion ($reducedMotion) when the error toast first mounts",
  async ({ reducedMotion, entryTimings }) => {
    // Given
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(reducedMotion);
    const user = userEvent.setup();
    await render(<Surface />);

    // When
    await user.press(screen.getByRole("button", { name: "Technical failure" }));

    // Then
    expect(
      screen.getByRole("alert", { name: TECHNICAL_ERROR }),
    ).toBeOnTheScreen();
    expect(
      jest.mocked(withTiming).mock.calls.map(([, config]) => config),
    ).toEqual(entryTimings);
  },
);

it("keeps page actions accessible while transient errors replace and expire", async () => {
  // Given
  const user = userEvent.setup();
  await render(<Surface />);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Technical failure" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Functional failure" }),
  ).toBeEnabled();

  // When
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // Then
  expect(
    screen.getByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Functional failure" }),
  ).toBeEnabled();

  // When
  await user.press(screen.getByRole("button", { name: "Functional failure" }));

  // Then
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(
    screen.getByRole("alert", { name: "Cette action est indisponible." }),
  ).toBeOnTheScreen();

  // When
  await act(() => jest.advanceTimersByTime(6_000));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Technical failure" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Functional failure" }),
  ).toBeEnabled();
});

it("replaces the previous notice with one accessible success through expiry", async () => {
  // Given
  const user = userEvent.setup();
  await render(<Surface />);
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // When
  await user.press(screen.getByRole("button", { name: "Save" }));

  // Then
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByRole("alert", { name: SAVED_MESSAGE })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

  // When
  await act(() => jest.advanceTimersByTime(4_000));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

it.each([
  {
    boundary: "the interaction unmounts",
    showActions: false,
    scope: "original",
  },
  { boundary: "the session changes", showActions: true, scope: "replacement" },
])(
  "ignores an acknowledgement after $boundary",
  async ({ showActions, scope }) => {
    // Given
    const response = Promise.withResolvers<void>();
    const user = userEvent.setup();
    const view = await render(<Surface response={response.promise} />);
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

    // When
    await view.rerender(
      <Surface
        showActions={showActions}
        scope={scope}
        response={response.promise}
      />,
    );
    await act(() => response.resolve());

    // Then
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  },
);

it("ignores a delayed failure after its originating interaction unmounts", async () => {
  // Given
  const response = Promise.withResolvers<void>();
  const user = userEvent.setup();
  const view = await render(<Surface response={response.promise} />);
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // When
  await view.rerender(<Surface showActions={false} />);
  await act(() => response.reject(new Error("Unavailable")));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it("drops old session feedback and refuses its delayed failure after a scope change", async () => {
  // Given
  const response = Promise.withResolvers<void>();
  const user = userEvent.setup();
  const view = await render(<Surface response={response.promise} />);
  await user.press(screen.getByRole("button", { name: "Functional failure" }));
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // When
  await view.rerender(
    <Surface scope="replacement" response={response.promise} />,
  );
  await act(() => response.reject(new Error("Old failure")));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Functional failure" }));

  // Then
  expect(
    screen.getByRole("alert", { name: "Cette action est indisponible." }),
  ).toBeOnTheScreen();
});

it("retains a published native-handoff failure after route removal until the session changes", async () => {
  // Given
  const user = userEvent.setup();
  const view = await render(<Surface retainOnUnmount />);
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // When
  await view.rerender(<Surface retainOnUnmount showActions={false} />);

  // Then
  expect(
    screen.getByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(<Surface scope="replacement" showActions={false} />);

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it("ignores a late handoff failure even when an already-published notice could survive navigation", async () => {
  // Given
  const response = Promise.withResolvers<void>();
  const user = userEvent.setup();
  const view = await render(
    <Surface retainOnUnmount response={response.promise} />,
  );
  await user.press(screen.getByRole("button", { name: "Technical failure" }));

  // When
  await view.rerender(<Surface retainOnUnmount showActions={false} />);
  await act(() => response.reject(new Error("Late provider failure")));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});
