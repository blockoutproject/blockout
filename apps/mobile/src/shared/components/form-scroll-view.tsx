import {
  NavigationScrollOffsetContext,
  useNavigationInset,
} from "./navigation-backdrop";
import { cloneElement, useCallback, useContext, type RefCallback } from "react";
import {
  useCollapsingTabsContext,
  useRegisterTabList,
  useRestoreTabOffset,
  useTabContentStyle,
  useTabPageContext,
  useTabScrollLifecycle,
} from "react-native-collapsible-tab";
import { PagedTabContext } from "./paged-tab-context";
import { hiddenScrollIndicators } from "../native/scroll-indicators";
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

/** Preserves each platform's native keyboard mechanism, handled taps and trailing page-owned bottom clearance. */
export function FormScrollView({
  children,
  contentContainerStyle,
  ...props
}: Readonly<FormScrollViewProps>) {
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const refreshControl = props.refreshControl
    ? cloneElement(props.refreshControl, {
        progressViewOffset:
          props.refreshControl.props.progressViewOffset ??
          tab?.contentInset ??
          inset,
      })
    : undefined;
  return tab ? (
    <TabbedFormScrollView
      {...props}
      refreshControl={refreshControl}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </TabbedFormScrollView>
  ) : (
    <OrdinaryFormScrollView
      {...props}
      refreshControl={refreshControl}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </OrdinaryFormScrollView>
  );
}

/** Ordinary forms observe their page material without taking over caller scroll events. */
function OrdinaryFormScrollView({
  contentContainerStyle,
  ...props
}: Readonly<FormScrollViewProps>) {
  const inset = useNavigationInset();
  const offset = useContext(NavigationScrollOffsetContext);
  const scroll = useAnimatedRef<ScrollViewInstance>();
  useScrollOffset(offset ? scroll : null, offset ?? undefined);
  // The keyboard component forwards the native ScrollView; discard the animated ref's return value.
  const bindScroll = useCallback(
    (node: ScrollViewInstance | null) => {
      scroll(node);
    },
    [scroll],
  );
  const content = StyleSheet.flatten(contentContainerStyle);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  const insets = {
    paddingTop: inset + (typeof padding === "number" ? padding : 0),
  };
  return (
    <NativeFormScrollView
      {...props}
      nativeRef={bindScroll}
      contentContainerStyle={[styles.content, contentContainerStyle, insets]}
    />
  );
}

/** Public RNCT adapter hooks retain native keyboard handling and caller events while publishing the scene offset. */
function TabbedFormScrollView({
  contentContainerStyle,
  ...props
}: Readonly<FormScrollViewProps>) {
  const { offsets } = useCollapsingTabsContext();
  const { index, scrollRef } = useTabPageContext();
  useScrollOffset(scrollRef, offsets[index]);
  const bindScroll = useCallback(
    (node: ScrollViewInstance | null) => {
      scrollRef(node);
    },
    [scrollRef],
  );

  /** Container commands always reach the current native form rather than retaining a former node. */
  function scrollToOffset(offset: number, animated = false) {
    scrollRef.current?.scrollTo({ y: offset, animated });
  }

  useRegisterTabList({
    scrollToOffset: ({ offset, animated }) => scrollToOffset(offset, animated),
  });
  useRestoreTabOffset(scrollToOffset);
  const content = useTabContentStyle([styles.content, contentContainerStyle]);
  const lifecycle = useTabScrollLifecycle({});
  return (
    <NativeFormScrollView
      {...props}
      {...lifecycle}
      nativeRef={bindScroll}
      contentContainerStyle={content}
    />
  );
}

/** One native form primitive keeps keyboard handling and trailing clearance identical in both page compositions. */
function NativeFormScrollView({
  children,
  nativeRef,
  ...props
}: Readonly<
  FormScrollViewProps &
    Pick<
      ScrollViewProps,
      "onScrollBeginDrag" | "onScrollEndDrag" | "onMomentumScrollEnd"
    > & {
      nativeRef: RefCallback<ScrollViewInstance>;
    }
>) {
  return Platform.OS === "ios" ? (
    <Animated.ScrollView
      {...props}
      ref={nativeRef}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      {...hiddenScrollIndicators}
      alwaysBounceVertical={!!props.refreshControl}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {children}
      <BottomContentSpacer />
    </Animated.ScrollView>
  ) : (
    <KeyboardProvider>
      <KeyboardAwareScrollView
        {...props}
        ref={nativeRef}
        {...hiddenScrollIndicators}
        alwaysBounceVertical={!!props.refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        <BottomContentSpacer />
      </KeyboardAwareScrollView>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1 } });
