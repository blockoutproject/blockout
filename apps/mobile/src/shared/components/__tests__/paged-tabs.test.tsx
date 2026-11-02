import { layoutNativeTabs } from "../../native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
function Example({ resetKey }: { resetKey?: string }) {
  const [selected, setSelected] = useState("one");
  return (
    <GestureHandlerRootView>
      <ThemeProvider>
        <PagedTabs
          selected={selected}
          onSelect={setSelected}
          tabs={[
            {
              id: "one",
              label: "Premier",
              content: <Text>Scène initiale</Text>,
            },
            { id: "two", label: "Deuxième", content: <Draft />, resetKey },
            {
              id: "three",
              label: "Troisième",
              content: <Text>Dernière scène</Text>,
            },
          ]}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

afterEach(() => jest.restoreAllMocks());

it("keeps neighboring feature reads unmounted during a partial swipe and admits the library's selected page", async () => {
  // Given
  await render(<Example />);
  await layoutNativeTabs();
  const pager = screen.getByTestId("native-tabs-pager");

  // When
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position: 0, offset: 0.5 },
  });

  // Then
  expect(
    screen.getByRole("tab", { name: "Premier", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  await fireEvent(pager, "pageSelected", { nativeEvent: { position: 1 } });

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
});

it("replaces only an invalidated scene and does not revive its earlier reading context", async () => {
  // Given
  const view = await render(<Example resetKey="criteria-a" />);
  await layoutNativeTabs();
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));
  await user.type(screen.getByLabelText("Note retenue"), "Ancienne lecture");
  await user.press(screen.getByRole("tab", { name: "Premier" }));

  // When
  await view.rerender(<Example resetKey="criteria-b" />);
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));

  // Then
  expect(screen.getByLabelText("Note retenue")).toHaveDisplayValue("");

  // When
  await user.type(screen.getByLabelText("Note retenue"), "Nouvelle lecture");
  await view.rerender(<Example resetKey="criteria-a" />);

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toHaveDisplayValue("");
});

it("accepts Android settlement even when idle precedes its selected event", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  await render(<Example />);
  await layoutNativeTabs();
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
  await layoutNativeTabs();
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
