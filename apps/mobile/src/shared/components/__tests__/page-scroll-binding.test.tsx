import { createRef } from "react";
import { Pressable, Text, type ScrollViewInstance } from "react-native";
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { Page, PageScrollView } from "../page";
import { PageFlatList } from "../page-list";

// Native event observation remains device evidence; this suite checks the ordinary public ref/callback boundary.
jest.mock("react-native-reanimated", () =>
  jest.requireMock("react-native-reanimated/mock"),
);

afterEach(() => jest.restoreAllMocks());

it("keeps the public scroll ref and caller events while its page observes native scrolling", async () => {
  // Given
  const ref = createRef<ScrollViewInstance>();
  const onScroll = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <Page header={<Text>Lecture</Text>}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir au début"
          onPress={() => ref.current?.scrollTo({ y: 0, animated: false })}
        >
          <Text>Revenir au début</Text>
        </Pressable>
        <PageScrollView
          accessibilityLabel="Lecture"
          ref={ref}
          onScroll={onScroll}
        >
          <Text>Contenu de la lecture</Text>
        </PageScrollView>
      </Page>
    </ThemeProvider>,
  );
  const native = ref.current;
  if (!native) throw new Error("The native scroll ref was not forwarded");
  const scrollTo = jest.spyOn(native, "scrollTo");
  const event = { nativeEvent: { contentOffset: { x: 0, y: 64 } } };

  // When
  await fireEvent.scroll(screen.getByLabelText("Lecture"), event);
  await user.press(screen.getByRole("button", { name: "Revenir au début" }));

  // Then
  expect(onScroll).toHaveBeenCalledWith(
    expect.objectContaining({
      nativeEvent: expect.objectContaining(event.nativeEvent),
    }),
  );
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});

it("retains a flat list's caller scroll event with its original data", async () => {
  // Given
  const onScroll = jest.fn();
  await render(
    <ThemeProvider>
      <Page header={<Text>Résultats</Text>}>
        <PageFlatList
          accessibilityLabel="Résultats"
          data={["Résultat conservé"]}
          renderItem={({ item }) => <Text>{item}</Text>}
          onScroll={onScroll}
        />
      </Page>
    </ThemeProvider>,
  );
  const event = { nativeEvent: { contentOffset: { x: 0, y: 64 } } };

  // When
  await fireEvent.scroll(screen.getByLabelText("Résultats"), event);

  // Then
  expect(onScroll).toHaveBeenCalledWith(
    expect.objectContaining({
      nativeEvent: expect.objectContaining(event.nativeEvent),
    }),
  );
  expect(screen.getByText("Résultat conservé")).toBeOnTheScreen();
});
