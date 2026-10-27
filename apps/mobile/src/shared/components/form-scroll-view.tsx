import { Platform, StyleSheet, type ScrollViewProps } from "react-native";
import Animated from "react-native-reanimated";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";

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

/** Uses the accepted single native keyboard mechanism per platform and preserves handled action taps. */
export function FormScrollView({
  contentContainerStyle,
  ...props
}: FormScrollViewProps) {
  return Platform.OS === "ios" ? (
    <Animated.ScrollView
      {...props}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      alwaysBounceVertical
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    />
  ) : (
    <KeyboardProvider>
      <KeyboardAwareScrollView
        {...props}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1 } });
