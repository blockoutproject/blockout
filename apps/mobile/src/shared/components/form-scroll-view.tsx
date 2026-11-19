import { NavigationScrollMarker } from "./navigation-backdrop";
import { cloneElement, useCallback } from "react";
import { usePageScrollBinding } from "./page-scroll-binding";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import {
  Platform,
  StyleSheet,
  type ScrollViewInstance,
  type ScrollViewProps,
} from "react-native";
import Animated, {
  useAnimatedRef,
  useScrollOffset,
} from "react-native-reanimated";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { BottomContentSpacer } from "./bottom-content-inset";

/** Bounded form content; callers own the draft, page chrome and content spacing. */
export type FormScrollViewProps = Pick<
  ScrollViewProps,
  | "children"
  | "accessibilityLabel"
  | "contentContainerStyle"
  | "refreshControl"
  | "onScroll"
  | "scrollEventThrottle"
  | "scrollIndicatorInsets"
>;

/** The native keyboard scroller keeps its position and publishes its offset without replacing caller events. */
export function FormScrollView({
  children,
  contentContainerStyle,
  ...props
}: Readonly<FormScrollViewProps>) {
  const { offset, contentInset, clearance } = usePageScrollBinding(
    contentContainerStyle,
  );
  const scroll = useAnimatedRef<ScrollViewInstance>();
  useScrollOffset(offset ? scroll : null, offset ?? undefined);
  // The keyboard component forwards the native ScrollView and expects a void ref callback.
  const bindScroll = useCallback(
    (node: ScrollViewInstance | null) => {
      scroll(node);
    },
    [scroll],
  );
  const refreshControl = props.refreshControl
    ? cloneElement(props.refreshControl, {
        progressViewOffset:
          props.refreshControl.props.progressViewOffset ?? contentInset,
      })
    : undefined;
  const scrollProps = {
    ...props,
    ...hiddenScrollIndicators,
    ref: bindScroll,
    alwaysBounceVertical: !!refreshControl,
    keyboardShouldPersistTaps: "handled" as const,
    scrollEventThrottle: props.scrollEventThrottle ?? 16,
    contentContainerStyle: [styles.content, contentContainerStyle, clearance],
    refreshControl,
  };

  return Platform.OS === "ios" ? (
    <NavigationScrollMarker>
      <Animated.ScrollView {...scrollProps} automaticallyAdjustKeyboardInsets>
        {children}
        <BottomContentSpacer />
      </Animated.ScrollView>
    </NavigationScrollMarker>
  ) : (
    <KeyboardProvider>
      <KeyboardAwareScrollView {...scrollProps}>
        {children}
        <BottomContentSpacer />
      </KeyboardAwareScrollView>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1 } });
