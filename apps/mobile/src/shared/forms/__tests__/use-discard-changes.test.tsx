import { nativeAlertAction } from "../../native/test-support/native-alert";
import { cleanup, act, screen, userEvent } from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useState } from "react";
import { Alert, Button, Text } from "react-native";
import { useDiscardChanges } from "../use-discard-changes";

const discarded = jest.fn();

beforeEach(() => {
  discarded.mockClear();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

/** Real route history and dirtiness drive the hook; only the native confirmation is controlled. */
function Editor() {
  const [dirty, setDirty] = useState(true);
  const confirmDiscard = useDiscardChanges(dirty, () => {
    discarded();
    setDirty(false);
  });
  return (
    <>
      <Text>{dirty ? "Unsaved draft" : "Saved draft"}</Text>
      <Button title="Save draft" onPress={() => setDirty(false)} />
      <Button
        title="Cancel inline draft"
        onPress={() => {
          void confirmDiscard(() => setDirty(false));
        }}
      />
    </>
  );
}

/** Opens an actual second route so repeating a blocked removal has observable navigation. */
async function openEditor() {
  await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Home</Text>,
      editor: Editor,
    },
    { initialUrl: "/" },
  );
  await act(() => router.push("/editor"));
  await screen.findByText("Unsaved draft");
}

it("asks once for two same-turn departures and discards only once", async () => {
  // Given
  await openEditor();

  // When
  await act(() => {
    router.back();
    router.back();
  });

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Unsaved draft")).toBeOnTheScreen();
  const choice = nativeAlertAction("Abandonner");

  // When
  await act(() => {
    choice();
    choice();
  });

  // Then
  await screen.findByText("Home");
  expect(screen.queryByText("Unsaved draft")).not.toBeOnTheScreen();
  expect(discarded).toHaveBeenCalledTimes(1);
});

it("does not discard or navigate when a held question outlives the dirty draft", async () => {
  // Given
  await openEditor();
  await act(() => router.back());
  const choice = nativeAlertAction("Abandonner");
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Save draft" }));
  await act(() => choice());

  // Then
  expect(screen.getByText("Saved draft")).toBeOnTheScreen();
  expect(discarded).not.toHaveBeenCalled();
});

it("shares the native confirmation while retaining an inline editor owner", async () => {
  // Given
  await openEditor();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Cancel inline draft" }));
  await act(() => nativeAlertAction("Abandonner")());

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Saved draft")).toBeOnTheScreen();
  expect(discarded).not.toHaveBeenCalled();

  // When
  await act(() => router.back());

  // Then
  expect(await screen.findByText("Home")).toBeOnTheScreen();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});
