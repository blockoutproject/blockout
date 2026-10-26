import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { BrandMark } from "./brand-mark";

/** Branded entry chrome; an optional trailing action remains owned by the entry journey. */
export interface BrandHeaderProps {
  children?: ReactNode;
}

/** Shares the approved discovery/age header anatomy; Page owns its surrounding native safe area. */
export function BrandHeader({ children }: BrandHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderColor: colors.border }]}>
      <View style={styles.brand} accessible accessibilityLabel="Blockout">
        <BrandMark />
        <Text style={[tokens.typography.navigation, { color: colors.text }]}>
          BLOCKOUT
        </Text>
      </View>
      {children && <View style={styles.action}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // These dimensions retain the approved entry composition rather than the ordinary back-navigation bar.
  header: {
    marginHorizontal: tokens.spacing["2xl"],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 69,
    paddingBottom: tokens.spacing.lg,
    borderBottomWidth: tokens.border.thin,
  },
  brand: { flexDirection: "row", gap: 9, alignItems: "center" },
  action: { marginLeft: "auto", maxWidth: "100%" },
});
