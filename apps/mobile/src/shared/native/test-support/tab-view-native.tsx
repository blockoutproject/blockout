import type { Ref } from "react";
import type { FlatList, FlatListProps } from "react-native";
import type { PagerViewProps } from "react-native-pager-view";

// Native handlers and animation keep their supported upstream Jest boundaries.
import "react-native-gesture-handler/jestSetup";
jest.mock("react-native-reanimated", () =>
  jest.requireActual("react-native-reanimated/mock"),
);

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
      setPage: (position) => settle(position, true),
      setPageWithoutAnimation: (position) => settle(position, false),
    }));
    // Production Scene owns inactive accessibility and first mounting, not the native double.
    return <View {...{ ...props, onPageSelected }}>{children}</View>;
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
