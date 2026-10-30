import { ThemeProvider } from "../../theme/theme-provider";
import { ActionFeedbackProvider } from "../../components/action-feedback";
import { TECHNICAL_ERROR } from "../../components/error-copy";
import type { PropsWithChildren } from "react";
import {
  act,
  cleanup,
  renderHook,
  screen,
} from "@testing-library/react-native";
import { Linking } from "react-native";
import { useNativeHandoff } from "../use-native-handoff";

/** Provides the real transient presentation owner for native handoff events. */
function HandoffProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

beforeEach(() => jest.spyOn(Linking, "openURL"));
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it("shows native opening feedback and permits an explicit retry after rejection", async () => {
  // Given
  const destination = "https://example.invalid/resource";
  const opening = Promise.withResolvers<void>();
  jest
    .mocked(Linking.openURL)
    .mockReturnValueOnce(opening.promise)
    .mockResolvedValue(undefined);
  const { result } = await renderHook(() => useNativeHandoff(destination), {
    wrapper: HandoffProviders,
  });

  // When
  await act(() => {
    void result.current.open();
  });

  // Then
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledWith(destination);
  expect(result.current.pending).toBe(true);

  // When
  await act(async () => opening.reject(new Error("Native failure")));

  // Then
  expect(screen.getByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(result.current.pending).toBe(false);
  expect(Linking.openURL).toHaveBeenCalledTimes(1);

  // When
  await act(async () => {
    await result.current.open();
  });

  // Then
  expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
    [destination],
    [destination],
  ]);
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
});
