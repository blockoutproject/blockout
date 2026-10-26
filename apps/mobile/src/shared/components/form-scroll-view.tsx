import { Platform, ScrollView, type ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";

/** Bounded form content; callers own the draft, page chrome and content spacing. */
export type FormScrollViewProps = Pick<
  ScrollViewProps,
  "children" | "contentContainerStyle"
>;

/** Uses the accepted single native keyboard mechanism per platform and preserves handled action taps. */
export function FormScrollView(props: FormScrollViewProps) {
  return Platform.OS === "ios" ? (
    <ScrollView
      {...props}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    />
  ) : (
    <KeyboardProvider>
      <KeyboardAwareScrollView {...props} keyboardShouldPersistTaps="handled" />
    </KeyboardProvider>
  );
}
