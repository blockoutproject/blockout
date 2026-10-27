import type { Ref } from "react";
import type { FlatList, FlatListProps, LayoutRectangle } from "react-native";
import type { PagerViewProps } from "react-native-pager-view";
import { fireEvent, screen } from "@testing-library/react-native";

// Native handlers keep their upstream Jest boundary; RNCT itself remains real.
import "react-native-gesture-handler/jestSetup";

// This scoped upstream mock excludes native animation/ref plumbing, not RNCT's React orchestration.
jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual<
    typeof import("react-native-reanimated")
  >("react-native-reanimated/mock");
  // The upstream makeMutable stub returns its input; reuse its shared-value double for imperative writes.
  return { ...Reanimated, makeMutable: Reanimated.useSharedValue };
});

jest.mock("react-native-pager-view", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  /** Native commands settle a page; tests may also dispatch the same public onPageSelected event. */
  function NativePager({
    ref,
    children,
    initialPage = 0,
    onPageSelected,
    ...props
  }: PagerViewProps & {
    ref?: Ref<{
      setPage: (index: number) => void;
      setPageWithoutAnimation: (index: number) => void;
    }>;
  }) {
    const [index, setIndex] = React.useState(initialPage);
    /** Projects native page settlement without reproducing swipe recognition or animation. */
    function settle(
      event: Parameters<NonNullable<PagerViewProps["onPageSelected"]>>[0],
    ) {
      setIndex(event.nativeEvent.position);
      onPageSelected?.(event);
    }
    React.useImperativeHandle(ref, () => ({
      setPage: (position) =>
        settle({ nativeEvent: { position } } as Parameters<
          NonNullable<PagerViewProps["onPageSelected"]>
        >[0]),
      setPageWithoutAnimation: (position) =>
        settle({ nativeEvent: { position } } as Parameters<
          NonNullable<PagerViewProps["onPageSelected"]>
        >[0]),
    }));
    return (
      <View {...{ ...props, onPageSelected: settle }}>
        {React.Children.map(children, (child, page) => (
          <View
            accessibilityElementsHidden={page !== index}
            importantForAccessibility={
              page === index ? "auto" : "no-hide-descendants"
            }
          >
            {child}
          </View>
        ))}
      </View>
    );
  }
  return { __esModule: true, default: NativePager };
});

jest.mock("@legendapp/list/reanimated", () => {
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
  return { AnimatedLegendList: NativeLegendViewport };
});

jest.mock("expo-blur", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { BlurView: View, BlurTargetView: View };
});

/**
 * Supplies missing native layout events so the real RNCT container can mount its pager and lists.
 * Uniform bounds are only a Jest viewport stimulus; native captures own actual geometry and gestures.
 */
export async function layoutNativeTabs() {
  const layout: LayoutRectangle = { x: 0, y: 0, width: 390, height: 844 };
  // Container/chrome measure first; newly mounted page viewports receive the next native layout pass.
  for (let pass = 0; pass < 2; pass += 1) {
    const nodes = screen.container.queryAll(
      (node) => typeof node.props.onLayout === "function",
    );
    for (const node of nodes)
      await fireEvent(node, "layout", { nativeEvent: { layout } });
  }
}
