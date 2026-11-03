import { StyleSheet, View, type ViewProps } from "react-native";
import { tokens } from "../theme/tokens";

/**
 * Places full-content Error/Empty feedback at the normal content start below chrome and controls.
 * Owns symmetric state insets; the parent supplies safe areas and the existing native scroll container.
 * Other local compositions may override alignment through the ordinary View style.
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
