import { layoutNativeTabs } from "../../native/test-support/tab-view-native";
import { createRef } from "react";
import {
  Platform,
  Pressable,
  Text,
  type ScrollViewInstance,
} from "react-native";
import {
  Container,
  Tab,
  useTabPageContext,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FormScrollView } from "../form-scroll-view";
import { PagedTabContext } from "../paged-tab-context";

// Keyboard geometry remains device evidence; the upstream double preserves the native ScrollView ref.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);

afterEach(() => jest.restoreAllMocks());

it.each(["ios", "android"] as const)(
  "preserves %s form scroll events and the container's native return command",
  async (platform) => {
    // Given
    jest.replaceProperty(Platform, "OS", platform);
    const pager = createRef<CollapsingTabsRef>();
    const onScroll = jest.fn();
    const user = userEvent.setup();
    let scrollTo: jest.SpyInstance | undefined;

    /** Observes the public adapter ref; native event-to-offset delivery still needs a device. */
    function NativeScrollBoundary() {
      const { scrollRef } = useTabPageContext();
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir au début"
          onPress={() => {
            const native: ScrollViewInstance | null = scrollRef.current;
            if (native) {
              scrollTo = jest.spyOn(native, "scrollTo");
            }
            pager.current?.scrollToTop(false);
          }}
        >
          <Text>Revenir au début</Text>
        </Pressable>
      );
    }

    await render(
      <GestureHandlerRootView>
        <Container ref={pager} initialTabName="active">
          <Tab name="active">
            <PagedTabContext value={{ contentInset: 80, stickyInset: 80 }}>
              <FormScrollView
                accessibilityLabel="Formulaire de publication"
                onScroll={onScroll}
              >
                <Text>Formulaire conservé</Text>
              </FormScrollView>
              <NativeScrollBoundary />
            </PagedTabContext>
          </Tab>
        </Container>
      </GestureHandlerRootView>,
    );
    await layoutNativeTabs();
    const event = { nativeEvent: { contentOffset: { x: 0, y: 80 } } };

    // When
    await fireEvent.scroll(
      screen.getByLabelText("Formulaire de publication"),
      event,
    );
    await user.press(screen.getByRole("button", { name: "Revenir au début" }));

    // Then
    expect(onScroll).toHaveBeenCalledWith(
      expect.objectContaining({
        nativeEvent: expect.objectContaining(event.nativeEvent),
      }),
    );
    expect(scrollTo).toBeDefined();
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(screen.getByText("Formulaire conservé")).toBeOnTheScreen();
  },
);
