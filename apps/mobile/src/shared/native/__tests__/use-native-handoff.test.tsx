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

it("opens a pending destination once and permits only an explicit attempt after rejection", async () => {
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
    result.current.open();
    result.current.open();
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
  await act(() => result.current.open());

  // Then
  expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
    [destination],
    [destination],
  ]);
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
});

it("does not restore old feedback after a destination changes away and back", async () => {
  // Given
  const opening = Promise.withResolvers<void>();
  jest.mocked(Linking.openURL).mockReturnValueOnce(opening.promise);
  const { result, rerender } = await renderHook(
    ({ url }: { url: string }) => useNativeHandoff(url),
    {
      wrapper: HandoffProviders,
      initialProps: { url: "https://one.example.invalid" },
    },
  );
  await act(() => result.current.open());

  // When
  await rerender({ url: "https://two.example.invalid" });
  await rerender({ url: "https://one.example.invalid" });
  await act(async () => opening.reject(new Error("Old failure")));

  // Then
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
  expect(result.current.pending).toBe(false);
});
