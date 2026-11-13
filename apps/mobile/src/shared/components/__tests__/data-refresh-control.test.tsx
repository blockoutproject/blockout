import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { TextInput } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { DataRefreshControl } from "../data-refresh-control";

/** A local field makes native child disposal observable; it is not a replacement for ScrollView. */
function Draft() {
  const [value, setValue] = useState("");
  return (
    <TextInput
      accessibilityLabel="Draft"
      value={value}
      onChangeText={setValue}
    />
  );
}

it("forwards the native scroll child and preserves it while refresh is disabled", async () => {
  // Given: Android ScrollView supplies this native child and layout to its refresh element.
  const refresh = jest.fn(async () => undefined);
  const user = userEvent.setup();
  const view = (enabled: boolean) => (
    <ThemeProvider>
      <DataRefreshControl onRefresh={refresh} enabled={enabled}>
        <Draft />
      </DataRefreshControl>
    </ThemeProvider>
  );
  const result = await render(view(true));
  await user.type(screen.getByLabelText("Draft"), "Retained");

  // When
  await result.rerender(view(false));

  // Then
  expect(screen.getByDisplayValue("Retained")).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).toBeDisabled();
  // Refresh is a native callback contract: fireEvent would bubble through the composite
  // to its caller prop even when the native RefreshControl receives no callback.
  expect(screen.getByLabelText("Actualiser les données")).not.toHaveProp(
    "onRefresh",
  );
  expect(refresh).not.toHaveBeenCalled();

  // When
  await result.rerender(view(true));
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(screen.getByDisplayValue("Retained")).toBeOnTheScreen();
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("keeps native pull progress and the Android child until the explicit read completes", async () => {
  // Given: the owner controls its read promise while the actual refresh control owns gesture progress.
  const response = Promise.withResolvers<void>();
  const refresh = jest.fn(() => response.promise);
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <DataRefreshControl onRefresh={refresh}>
        <Draft />
      </DataRefreshControl>
    </ThemeProvider>,
  );
  await user.type(screen.getByLabelText("Draft"), "Retained");

  try {
    // When: userEvent cannot express the native pull-to-refresh event.
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(screen.getByLabelText("Actualiser les données")).toBeBusy();
    expect(screen.getByDisplayValue("Retained")).toBeOnTheScreen();
    expect(refresh).toHaveBeenCalledTimes(1);

    // When
    await act(() => response.resolve());

    // Then
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
    expect(screen.getByDisplayValue("Retained")).toBeOnTheScreen();
  } finally {
    await act(() => response.resolve());
  }
});

it("removes native pull progress while the owning read is suspended without disposing the retained field", async () => {
  // Given: the feature reports actual Query activity separately from the gesture's unresolved promise.
  const response = Promise.withResolvers<void>();
  const refresh = jest.fn(() => response.promise);
  const view = (fetching: boolean) => (
    <ThemeProvider>
      <DataRefreshControl onRefresh={refresh} fetching={fetching}>
        <Draft />
      </DataRefreshControl>
    </ThemeProvider>
  );
  const result = await render(view(true));
  await userEvent.type(screen.getByLabelText("Draft"), "Retained");

  try {
    // When: userEvent cannot express a native pull.
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await result.rerender(view(false));

    // Then
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
    expect(screen.getByDisplayValue("Retained")).toBeOnTheScreen();
    expect(refresh).toHaveBeenCalledTimes(1);

    // When
    await result.rerender(view(true));

    // Then
    expect(screen.getByLabelText("Actualiser les données")).toBeBusy();

    // When
    await act(() => response.resolve());

    // Then
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
  } finally {
    await act(() => response.resolve());
  }
});
