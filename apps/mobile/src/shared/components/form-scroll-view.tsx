import { hiddenScrollIndicators } from "../native/scroll-indicators";
import { Platform, StyleSheet, type ScrollViewProps } from "react-native";
import Animated from "react-native-reanimated";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import { BottomContentSpacer } from "./bottom-content-inset";

/** Bounded form content; callers own the draft, page chrome and content spacing. */
export type FormScrollViewProps = Pick<
  ScrollViewProps,
  | "children"
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
}: FormScrollViewProps) {
  return Platform.OS === "ios" ? (
    <Animated.ScrollView
      {...props}
      {...hiddenScrollIndicators}
      contentContainerStyle={[styles.content, contentContainerStyle]}
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
        {...hiddenScrollIndicators}
        contentContainerStyle={[styles.content, contentContainerStyle]}
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
