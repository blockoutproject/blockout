import { layoutNativeTabs } from "@/shared/native/test-support/tab-view-native";
import { useState } from "react";
import { Platform, Text, TextInput } from "react-native";
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { FormScrollView } from "../form-scroll-view";
import { PagedTabs } from "../paged-tabs";

// Native keyboard geometry remains device evidence.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);

afterEach(() => jest.restoreAllMocks());

it.each(["ios", "android"] as const)(
  "keeps %s form scroll events and the mounted draft when changing tabs",
  async (platform) => {
    // Given
    jest.replaceProperty(Platform, "OS", platform);
    const onScroll = jest.fn();
    const user = userEvent.setup();

    function Example() {
      const [tab, setTab] = useState("form");
      return (
        <ThemeProvider>
          <PagedTabs
            selected={tab}
            onSelect={setTab}
            tabs={[
              {
                id: "form",
                label: "Publication",
                content: (
                  <FormScrollView
                    accessibilityLabel="Formulaire de publication"
                    onScroll={onScroll}
                  >
                    <TextInput accessibilityLabel="Lien vidéo" />
                  </FormScrollView>
                ),
              },
              {
                id: "history",
                label: "Historique",
                content: <Text>Publications précédentes</Text>,
              },
            ]}
          />
        </ThemeProvider>
      );
    }

    await render(<Example />);
    await layoutNativeTabs();
    const event = { nativeEvent: { contentOffset: { x: 0, y: 80 } } };

    // When
    await user.type(
      screen.getByLabelText("Lien vidéo"),
      "https://example.org/video",
    );
    await fireEvent.scroll(
      screen.getByLabelText("Formulaire de publication"),
      event,
    );
    await user.press(screen.getByRole("tab", { name: "Historique" }));

    // Then
    expect(onScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeEvent: expect.objectContaining(event.nativeEvent),
      }),
    );
    expect(screen.getByText("Publications précédentes")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Lien vidéo")).toBeNull();

    // When
    await user.press(screen.getByRole("tab", { name: "Publication" }));

    // Then
    expect(screen.getByLabelText("Lien vidéo")).toHaveDisplayValue(
      "https://example.org/video",
    );
  },
);
