import type { Ref } from "react";
import type {
  FlatList,
  FlatListProps,
  LayoutRectangle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
  ScrollViewProps,
} from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";

const mockViewport: LayoutRectangle = { x: 0, y: 0, width: 390, height: 844 };

/** Observes native horizontal commands; selection and content remain production-owned. */
export const mockPagerCommands = {
  animated: jest.fn<boolean | undefined, [index: number]>(),
  immediate: jest.fn<boolean | undefined, [index: number]>(),
};

function mockScrollOffset(x: number) {
  return {
    nativeEvent: { contentOffset: { x, y: 0 } },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

jest.mock("react-native-reanimated", () => {
  const upstream = jest.requireMock<typeof import("react-native-reanimated")>(
    "react-native-reanimated/mock",
  );
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  type MockScrollProps = ScrollViewProps & {
    ref?: Ref<Pick<ScrollViewInstance, "scrollTo">>;
  };

  type MockAnimatedScrollProps = ScrollViewProps & {
    ref?: Ref<ScrollViewInstance>;
  };

  /** Projects only native event delivery and completed commands, without simulating gesture geometry. */
  function NativePager({
    ref,
    onScroll,
    onMomentumScrollEnd,
    ...props
  }: MockScrollProps) {
    React.useImperativeHandle(ref, () => ({
      scrollTo(options = {}) {
        const { x = 0, animated = true } =
          typeof options === "number" ? {} : options;
        const record = animated
          ? mockPagerCommands.animated
          : mockPagerCommands.immediate;
        if (record(Math.round(x / mockViewport.width)) === false) {
          return;
        }
        const event = mockScrollOffset(x);
        onScroll?.(event);
        if (animated) {
          onMomentumScrollEnd?.(event);
        }
      },
    }));
    return <View {...{ ...props, onScroll, onMomentumScrollEnd }} />;
  }

  function AnimatedScrollView(props: MockAnimatedScrollProps) {
    const Scroll = upstream.default.ScrollView;
    return props.testID === "native-tabs-pager" ? (
      <NativePager {...props} />
    ) : (
      <Scroll {...props} />
    );
  }

  return {
    ...upstream,
    default: { ...upstream.default, ScrollView: AnimatedScrollView },
    clamp: (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value)),
    makeMutable: upstream.useSharedValue,
    useSharedValue: <Value,>(initial: Value) =>
      React.useState(() => upstream.useSharedValue(initial))[0],
    useAnimatedScrollHandler:
      (handlers: { onScroll: (event: NativeScrollEvent) => void }) =>
      (event: NativeSyntheticEvent<NativeScrollEvent>) =>
        handlers.onScroll(event.nativeEvent),
  };
});

jest.mock("@legendapp/list/react-native", () => {
  const { FlatList } =
    jest.requireActual<typeof import("react-native")>("react-native");

  /** Preserves list content, refresh and continuation at the JavaScript boundary. */
  function NativeLegendViewport({
    ref,
    ...props
  }: Readonly<FlatListProps<unknown> & { ref?: Ref<FlatList<unknown>> }>) {
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
