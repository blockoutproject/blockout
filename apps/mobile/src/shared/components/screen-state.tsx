import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";

/**
 * Centers blocking feedback in the space left by the screen's chrome.
 * The parent owns safe areas, symmetric padding and a flex-growing scroll container.
 */
export function ScreenState({ children }: PropsWithChildren) {
  return (
    <View style={styles.area}>
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
  },
  content: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: tokens.spacing.md,
  },
});
