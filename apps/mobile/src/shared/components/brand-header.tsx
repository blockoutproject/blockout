import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { BrandMark } from "./brand-mark";

/** Branded entry chrome with a fully named, one-line brand; an optional trailing action remains owned by the entry journey. */
export interface BrandHeaderProps {
  children?: ReactNode;
}

/** Shares entry branding and trailing actions across discovery, age and admission; Page owns the native safe area. */
export function BrandHeader({ children }: Readonly<BrandHeaderProps>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderColor: colors.border }]}>
      <View style={styles.brand} accessible accessibilityLabel="Blockout">
        <BrandMark />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.name, { color: colors.text }]}
        >
          BLOCKOUT
        </Text>
      </View>
      {children && <View style={styles.action}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Center the wrapped line as well as its controls so a trailing action never shifts the brand vertically.
  header: {
    marginHorizontal: tokens.spacing["2xl"],
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    gap: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tokens.layout.brandHeader,
    paddingBottom: tokens.spacing.lg,
    borderBottomWidth: tokens.border.thin,
  },
  brand: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "center",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  name: { ...tokens.typography.navigation, minWidth: 0, flexShrink: 1 },
  action: { marginLeft: "auto", maxWidth: "100%" },
});
