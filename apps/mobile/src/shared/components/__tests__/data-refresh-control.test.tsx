import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { TextInput } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
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
  const refresh = jest.fn();
  const user = userEvent.setup();
  const view = (enabled: boolean) => (
    <ThemeProvider>
      <DataRefreshControl
        refreshing={false}
        onRefresh={refresh}
        enabled={enabled}
        style={{ flex: 1 }}
      >
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
  expect(screen.getByLabelText("Actualiser les données")).toHaveStyle({
    flex: 1,
  });
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
