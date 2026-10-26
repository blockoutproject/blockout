import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Flat information and form grouping shared by resource, preparation, account and administration screens. */
export function Surface({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    overflow: "hidden",
  },
});
