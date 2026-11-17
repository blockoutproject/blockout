import { ActivityIndicator, StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";

/** Native progress for caller-owned pending controls; the control retains its name and busy state. */
export function LoadingIndicator({ color }: Readonly<{ color: string }>) {
  return (
    <View
      style={styles.slot}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <ActivityIndicator size="small" color={color} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
