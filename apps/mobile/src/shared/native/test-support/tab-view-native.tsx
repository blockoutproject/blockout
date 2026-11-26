import type { Ref } from "react";
import type { FlatList, FlatListProps } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import { mockScrollOffset, mockViewport } from "./tab-scroll-boundary";

export { mockPagerCommands } from "./tab-scroll-boundary";

jest.mock("react-native-reanimated", () =>
  jest.requireMock("react-native-reanimated/mock"),
);

jest.mock("@legendapp/list/react-native", () => {
  const { FlatList } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const { useImperativeHandle, useRef } =
    jest.requireActual<typeof import("react")>("react");

  /** Preserves list content, refresh and continuation at the JavaScript boundary. */
  function NativeLegendViewport({
    ref,
    ...props
  }: Readonly<FlatListProps<unknown> & { ref?: Ref<FlatList<unknown>> }>) {
    const viewport = useRef<FlatList<unknown>>(null);
    useImperativeHandle<FlatList<unknown> | null, FlatList<unknown> | null>(
      ref,
      () =>
        viewport.current &&
        Object.assign(viewport.current, {
          scrollToKey: () => Promise.resolve(),
          // The native test renderer starts at rest and supplies no measured range.
          getState: () => ({ scroll: 0, start: -1, end: -1 }),
        }),
      [],
    );
    return (
      <FlatList
        {...props}
        ref={viewport}
        numColumns={1}
        stickyHeaderIndices={undefined}
      />
    );
  }

  return { LegendList: NativeLegendViewport };
});

/** Supplies the layout absent from the native test renderer; these bounds prove no geometry. */
export async function layoutNativeTabs() {
  const nodes = screen.container.queryAll(
    (node) => typeof node.props.onLayout === "function",
  );
  for (const node of nodes) {
    await fireEvent(node, "layout", { nativeEvent: { layout: mockViewport } });
  }
}

/** Dispatches native horizontal progress and, when requested, its final settled event. */
export async function scrollNativeTabs(position: number, settled = false) {
  const pager = screen.getByTestId("native-tabs-pager");
  const event = mockScrollOffset(position * mockViewport.width);
  await fireEvent.scroll(pager, event);
  if (settled) {
    await fireEvent(pager, "momentumScrollEnd", event);
  }
}
