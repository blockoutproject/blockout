import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { Skeleton } from "./skeleton";

/** Shared compact skeleton for caller-owned pending controls; the control retains its name and busy state. */
export function LoadingIndicator({ color }: Readonly<{ color: string }>) {
  return (
    <View style={styles.slot} accessible={false}>
      <Skeleton
        width={tokens.size.icon.md}
        height={tokens.spacing.md}
        color={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    justifyContent: "center",
    opacity: tokens.opacity.disabled,
  },
});
