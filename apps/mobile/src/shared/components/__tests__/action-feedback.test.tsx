import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { ActionFeedbackProvider, useActionFeedback } from "../action-feedback";
import { ThemeProvider } from "../../theme/theme-provider";
import { TECHNICAL_ERROR } from "../error-copy";

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

/** Exercises actual presentation events; the optional promise controls only the remote failure boundary. */
function Actions({
  response,
  retainOnUnmount,
}: {
  response?: Promise<void>;
  retainOnUnmount?: boolean;
}) {
  const feedback = useActionFeedback({ retainOnUnmount });
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Technical failure"
        onPress={() => {
          if (response) void response.catch(() => feedback.error());
          else feedback.error();
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
    </>
  );
}

/** The ordinary providers remain real; the scope models the root's session presentation boundary. */
function Surface({
  scope = "original",
  showActions = true,
  response,
  retainOnUnmount,
}: {
  scope?: string;
  showActions?: boolean;
  response?: Promise<void>;
  retainOnUnmount?: boolean;
}) {
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

it("presents one accessible transient error and replaces it without a queue", async () => {
  // Given
  const user = userEvent.setup();
  await render(<Surface />);

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
});

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
