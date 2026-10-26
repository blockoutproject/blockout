import { StyleSheet, View, type ViewProps } from "react-native";
import { tokens } from "../theme/tokens";

/**
 * Centers blocking feedback in the space left by the screen's chrome.
 * Owns symmetric state insets; the parent supplies safe areas and a flex-growing scroll container.
 * Native lists inject layout measurement and styles into their empty component; these reach its root view.
 */
export function ScreenState({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.area, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    padding: tokens.spacing.screen,
  },
  content: {
    width: "100%",
    maxWidth: tokens.layout.width.compact,
    alignItems: "center",
    gap: tokens.spacing.md,
  },
});
