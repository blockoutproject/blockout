import type { Ref } from "react";
import type {
  FlatList,
  FlatListProps,
  LayoutRectangle,
  ViewInstance,
} from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import type { PagerViewProps } from "react-native-pager-view";

// Native handlers and animation keep their supported upstream Jest boundaries.
import "react-native-gesture-handler/jestSetup";
jest.mock("react-native-reanimated", () => {
  const upstream = jest.requireMock<typeof import("react-native-reanimated")>(
    "react-native-reanimated/mock",
  );
  // The upstream imperative mutable stub is a scalar; RNCT needs the same writable value contract as useSharedValue.
  return { ...upstream, makeMutable: upstream.useSharedValue };
});

jest.mock("react-native-pager-view", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  /** Native commands settle a page; tests may also dispatch the same public onPageSelected event. */
  function NativePager({
    ref,
    children,
    onPageSelected,
    ...props
  }: PagerViewProps & {
    ref?: Ref<{
      setPage: (index: number) => void;
      setPageWithoutAnimation: (index: number) => void;
    }>;
  }) {
    const host = React.useRef<ViewInstance>(null);
    /** Projects a completed animated command; tests can separately dispatch early native events. */
    function settle(position: number, animated: boolean) {
      onPageSelected?.({ nativeEvent: { position } } as Parameters<
        NonNullable<PagerViewProps["onPageSelected"]>
      >[0]);
      if (animated) {
        props.onPageScroll?.({
          nativeEvent: { position, offset: 0 },
        } as Parameters<NonNullable<PagerViewProps["onPageScroll"]>>[0]);
        props.onPageScrollStateChanged?.({
          nativeEvent: { pageScrollState: "idle" },
        } as Parameters<
          NonNullable<PagerViewProps["onPageScrollStateChanged"]>
        >[0]);
      }
    }
    React.useImperativeHandle(ref, () => ({
      getScrollableNode: () => host.current,
      setPage: (position) => settle(position, true),
      setPageWithoutAnimation: (position) => settle(position, false),
    }));
    // Production Scene owns inactive accessibility and first mounting, not the native double.
    return (
      <View
        ref={host}
        testID="native-tabs-pager"
        {...{ ...props, onPageSelected }}
      >
        {children}
      </View>
    );
  }

  return { __esModule: true, default: NativePager };
});

jest.mock("@legendapp/list/react-native", () => {
  const { FlatList } =
    jest.requireActual<typeof import("react-native")>("react-native");
  /** Keeps rows, list states, refresh and continuation public; recycling, spans and sticky geometry stay native evidence. */
  function NativeLegendViewport({
    ref,
    ...props
  }: FlatListProps<unknown> & { ref?: Ref<FlatList<unknown>> }) {
    return (
      <FlatList
        {...props}
        ref={ref}
        numColumns={1}
        stickyHeaderIndices={undefined}
      />
    );
  }
  return { LegendList: NativeLegendViewport };
});

jest.mock("@legendapp/list/reanimated", () => ({
  AnimatedLegendList: jest.requireMock("@legendapp/list/react-native")
    .LegendList,
}));

/** Supplies absent native layout events to the real collapsing container; these uniform bounds prove no geometry. */
export async function layoutNativeTabs() {
  const layout: LayoutRectangle = { x: 0, y: 0, width: 390, height: 844 };
  for (let pass = 0; pass < 2; pass += 1) {
    const nodes = screen.container.queryAll(
      (node) => typeof node.props.onLayout === "function",
    );
    for (const node of nodes)
      await fireEvent(node, "layout", { nativeEvent: { layout } });
  }
}
