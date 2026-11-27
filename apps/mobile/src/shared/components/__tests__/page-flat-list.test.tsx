import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { Text, View, type FlatList } from "react-native";

import { ThemeProvider } from "@/shared/theme/theme-provider";
import { BottomContentInsetContext } from "../bottom-content-inset";
import { useContentReveal } from "../content-reveal";
import { PageFlatList } from "../page-list";

const items = ["Section", "Visible card", "Covered card"];

it.each([
  { initial: items, phase: "retained cards" },
  { initial: ["Section"], phase: "a loading section" },
])(
  "admits the first usable cards after $phase without a new visibility event",
  async ({ initial }) => {
    const list = createRef<FlatList<string>>();
    const admitted = jest.fn();

    function Results({
      active,
      data,
    }: Readonly<{ active: boolean; data: string[] }>) {
      const presentation = useContentReveal(active);
      return (
        <BottomContentInsetContext value={80}>
          <PageFlatList
            ref={list}
            testID="results"
            data={data}
            keyExtractor={(item) => item}
            reveal={{
              blockKey: (item) => (item === "Section" ? undefined : item),
              presentation: {
                ...presentation,
                start: (keys) => {
                  admitted(keys);
                  presentation.start(keys);
                },
              },
            }}
            renderItem={({ item }) => <Text>{item}</Text>}
          />
        </BottomContentInsetContext>
      );
    }

    // Given a retained 400-point scroller with its bottom 80 points behind navigation.
    await render(<Results active={false} data={initial} />, {
      wrapper: ThemeProvider,
    });
    const viewport = list.current!.getNativeScrollRef()!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 400 },
      getBoundingClientRect: {
        configurable: true,
        value: () => ({ top: 0, bottom: 400 }),
      },
    });
    const cardBounds = jest
      .fn()
      .mockReturnValueOnce({ top: 64, bottom: 114, height: 50 })
      .mockReturnValueOnce({ top: 350, bottom: 400, height: 50 });
    Object.defineProperty(View.prototype, "getBoundingClientRect", {
      configurable: true,
      value: cardBounds,
    });
    try {
      await fireEvent(screen.getByTestId("results"), "viewableItemsChanged", {
        viewableItems: initial.map((item, index) => ({
          item,
          key: item,
          index,
          isViewable: true,
        })),
        changed: [],
      });
      admitted.mockClear();

      // When the route becomes active without another native visibility event.
      await screen.rerender(<Results active data={items} />);

      // Then the heading and covered card consume no entrance rank.
      expect(admitted).toHaveBeenCalledWith(["Visible card"]);
    } finally {
      Reflect.deleteProperty(View.prototype, "getBoundingClientRect");
    }
  },
);
