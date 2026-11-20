import {
  layoutNativeTabs,
  mockPagerCommands,
  scrollNativeTabs,
} from "@/shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, Text, TextInput } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
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

function FirstScene({ onRead }: Readonly<{ onRead?: () => void }>) {
  useEffect(() => onRead?.(), [onRead]);
  return <Text>Scène initiale</Text>;
}

/** Feature selection is real React state; only the native pager/animation boundary is controlled. */
function Example({
  initialSelected = "one",
  readFirstScene,
  resetKey,
  removeSecond = false,
}: Readonly<{
  initialSelected?: string;
  readFirstScene?: () => void;
  resetKey?: string;
  removeSecond?: boolean;
}>) {
  const [selected, setSelected] = useState(initialSelected);
  return (
    <GestureHandlerRootView>
      <ThemeProvider>
        <PagedTabs
          selected={removeSecond && selected === "two" ? "three" : selected}
          onSelect={setSelected}
          tabs={[
            {
              id: "one",
              label: "Premier",
              content: <FirstScene onRead={readFirstScene} />,
            },
            ...(removeSecond
              ? []
              : [
                  {
                    id: "two",
                    label: "Deuxième",
                    content: <Draft />,
                    preview: <Text>Aperçu décoratif</Text>,
                    resetKey,
                  },
                ]),
            {
              id: "three",
              label: "Troisième",
              content: <Text>Dernière scène</Text>,
              preview: <Text>Aperçu troisième scène</Text>,
            },
          ]}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

afterEach(() => jest.restoreAllMocks());

it.each([false, true])(
  "requests native tab animation according to reduced motion (%s) while retaining destination content",
  async (reducedMotion) => {
    // Given
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(reducedMotion);
    await render(<Example />);
    await layoutNativeTabs();
    mockPagerCommands.animated.mockClear();
    mockPagerCommands.immediate.mockClear();
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("tab", { name: "Deuxième" }));

    // Then: this native command contract proves no animation geometry or frame rate.
    expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
    expect(
      reducedMotion ? mockPagerCommands.immediate : mockPagerCommands.animated,
    ).toHaveBeenCalledWith(1);
    expect(
      reducedMotion ? mockPagerCommands.animated : mockPagerCommands.immediate,
    ).not.toHaveBeenCalled();
  },
);

it("mounts the available previews up front and admits content at settlement", async () => {
  // Given
  await render(<Example />);
  await layoutNativeTabs();

  expect(
    screen.getByText("Aperçu décoratif", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Aperçu troisième scène", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aperçu troisième scène")).toBeNull();

  // When
  await scrollNativeTabs(0.5);

  // Then
  expect(
    screen.getByRole("tab", { name: "Premier", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aperçu décoratif")).toBeNull();
  expect(
    screen.getByText("Aperçu décoratif", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  await scrollNativeTabs(1, true);

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
  expect(
    screen.queryByText("Aperçu décoratif", { includeHiddenElements: true }),
  ).toBeNull();
  expect(
    screen.getByText("Aperçu troisième scène", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Dernière scène", { includeHiddenElements: true }),
  ).toBeNull();
});

it("shows the preview of an invalidated scene until it is selected again", async () => {
  // Given
  const view = await render(<Example resetKey="criteria-a" />);
  await layoutNativeTabs();
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));
  await user.type(screen.getByLabelText("Note retenue"), "Ancienne lecture");
  await user.press(screen.getByRole("tab", { name: "Premier" }));

  // When
  await view.rerender(<Example resetKey="criteria-b" />);

  // Then: the replacement has not inherited the previous context's admission.
  expect(
    screen.getByText("Aperçu décoratif", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();

  // When
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

it("does not admit a page briefly crossed before the swipe settles elsewhere", async () => {
  // Given
  await render(<Example />);
  await layoutNativeTabs();

  // When
  await scrollNativeTabs(1);
  await scrollNativeTabs(2, true);

  // Then
  expect(
    screen.getByRole("tab", { name: "Troisième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Dernière scène")).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Note retenue", { includeHiddenElements: true }),
  ).toBeNull();
});

it("keeps the selected intermediate page if an earlier animated jump ends elsewhere", async () => {
  // Given
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(false);
  await render(<Example />);
  await layoutNativeTabs();
  const user = userEvent.setup();
  mockPagerCommands.animated.mockReturnValueOnce(false);
  await user.press(screen.getByRole("tab", { name: "Troisième" }));
  await scrollNativeTabs(1);

  // When: native already reported this offset, so its same-offset command emits no event.
  mockPagerCommands.immediate.mockReturnValueOnce(false);
  await user.press(screen.getByRole("tab", { name: "Deuxième" }));
  await scrollNativeTabs(2, true);

  // Then
  expect(
    screen.getByRole("tab", { name: "Deuxième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Note retenue")).toBeOnTheScreen();
  expect(
    screen.queryByText("Dernière scène", { includeHiddenElements: true }),
  ).toBeNull();
});

it("directly admits the controlled replacement when the active scene is removed", async () => {
  // Given
  const readFirstScene = jest.fn();
  const view = await render(
    <Example initialSelected="two" readFirstScene={readFirstScene} />,
  );
  await layoutNativeTabs();
  mockPagerCommands.animated.mockClear();
  mockPagerCommands.immediate.mockClear();

  // When
  await view.rerender(
    <Example
      initialSelected="two"
      readFirstScene={readFirstScene}
      removeSecond
    />,
  );

  // Then
  expect(
    screen.getByRole("tab", { name: "Troisième", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Dernière scène")).toBeOnTheScreen();
  expect(readFirstScene).not.toHaveBeenCalled();
  expect(mockPagerCommands.immediate).toHaveBeenCalledTimes(1);
  expect(mockPagerCommands.immediate).toHaveBeenCalledWith(1);
  expect(mockPagerCommands.animated).not.toHaveBeenCalled();
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
