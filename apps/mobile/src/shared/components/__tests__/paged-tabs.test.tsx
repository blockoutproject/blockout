import "../../native/test-support/tab-view-native";
import { useState } from "react";
import { AccessibilityInfo, Platform, Text, TextInput } from "react-native";
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { PagedTabs } from "../paged-tabs";

/** A retained feature draft exposes scene lifetime without observing component internals. */
function Draft() {
  const [value, setValue] = useState("");
  return (
    <TextInput
      accessibilityLabel="Note retenue"
      value={value}
      onChangeText={setValue}
    />
  );
}

/** Feature selection is real React state; only the native pager/animation boundary is controlled. */
function Example() {
  const [selected, setSelected] = useState("one");
  return (
    <ThemeProvider>
      <PagedTabs
        selected={selected}
        onSelect={setSelected}
        tabs={[
          { id: "one", label: "Premier", content: <Text>Scène initiale</Text> },
          { id: "two", label: "Deuxième", content: <Draft /> },
          {
            id: "three",
            label: "Troisième",
            content: <Text>Dernière scène</Text>,
          },
        ]}
      />
    </ThemeProvider>
  );
}

afterEach(() => jest.restoreAllMocks());

it("admits an iOS scene at the terminal idle instead of its early selected event", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  await render(<Example />);
  const pager = screen.getByTestId("native-tabs-pager");

  // When
  await fireEvent(pager, "pageSelected", { nativeEvent: { position: 1 } });

  // Then
  expect(
    screen.getByRole("tab", { name: "Premier", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position: 1, offset: 0 },
  });
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
});

it("keeps the terminal iOS page when interrupted commands report another candidate", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  await render(<Example />);
  const pager = screen.getByTestId("native-tabs-pager");

  // When
  await fireEvent(pager, "pageSelected", { nativeEvent: { position: 1 } });
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position: 0, offset: 0 },
  });
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });

  // Then
  expect(
    screen.getByRole("tab", { name: "Premier", selected: true }),
  ).toBeOnTheScreen();

  // When
  await fireEvent(pager, "pageSelected", { nativeEvent: { position: 2 } });
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position: 2, offset: 0 },
  });
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });

  // Then
  expect(
    screen.getByRole("tab", { name: "Troisième", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();
});

it("accepts Android settlement even when idle precedes its selected event", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  await render(<Example />);
  const pager = screen.getByTestId("native-tabs-pager");

  // When
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });
  await fireEvent(pager, "pageSelected", { nativeEvent: { position: 1 } });

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
});

it("uses nonanimated confirmation and preserves a visited draft while hiding the inactive scene", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(true);
  await render(<Example />);
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));
  await user.type(screen.getByLabelText("Note retenue"), "Brouillon conservé");

  // When
  await user.press(screen.getByRole("tab", { name: "Premier" }));

  // Then
  expect(screen.queryByLabelText("Note retenue")).toBeNull();
  expect(
    screen.getByDisplayValue("Brouillon conservé", {
      includeHiddenElements: true,
    }),
  ).toBeTruthy();

  // When
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));

  // Then
  expect(screen.getByDisplayValue("Brouillon conservé")).toBeOnTheScreen();
});
