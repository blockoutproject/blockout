import { useImperativeHandle, useState, type Ref } from "react";
import {
  View,
  type LayoutRectangle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from "react-native";

export const mockViewport: LayoutRectangle = {
  x: 0,
  y: 0,
  width: 390,
  height: 844,
};

/** Observes native horizontal commands; selection and content remain production-owned. */
export const mockPagerCommands = {
  animated: jest.fn<boolean | undefined, [index: number]>(),
  immediate: jest.fn<boolean | undefined, [index: number]>(),
};

export function mockScrollOffset(x: number) {
  return {
    nativeEvent: { contentOffset: { x, y: 0 } },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

/** Exposes the ordinary native commands and progress expected by both direct and Router-mounted suites. */
export function mockReanimatedTabScroll(
  upstream: typeof import("react-native-reanimated"),
) {
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
    useImperativeHandle(ref, () => ({
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
      useState(() => upstream.useSharedValue(initial))[0],
    useAnimatedScrollHandler:
      (handlers: { onScroll: (event: NativeScrollEvent) => void }) =>
      (event: NativeSyntheticEvent<NativeScrollEvent>) =>
        handlers.onScroll(event.nativeEvent),
  };
}
