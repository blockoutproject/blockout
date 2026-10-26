import { act, screen, userEvent } from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useState } from "react";
import { Alert, Button, Text, type AlertButton } from "react-native";
import { useDiscardChanges } from "../use-discard-changes";

const discarded = jest.fn();

beforeEach(() => {
  discarded.mockClear();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

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

/** Extracts the visible platform choice without mocking navigation or form behavior. */
function discardChoice(): AlertButton {
  const choice = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find(({ text }) => text === "Abandonner");
  if (!choice) throw new Error("Missing native discard confirmation");
  return choice;
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
  const choice = discardChoice();

  // When
  await act(() => {
    choice.onPress?.();
    choice.onPress?.();
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
  const choice = discardChoice();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Save draft" }));
  await act(() => choice.onPress?.());

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
  await act(() => discardChoice().onPress?.());

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
