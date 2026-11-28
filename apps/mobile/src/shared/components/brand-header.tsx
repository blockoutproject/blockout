import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { BrandTitle } from "./brand-title";

/** Branded entry chrome with a fully named, one-line brand; an optional trailing action remains owned by the entry journey. */
export interface BrandHeaderProps {
  children?: ReactNode;
}

/** Shares entry branding and trailing actions across discovery and admission; Page owns the native safe area. */
export function BrandHeader({ children }: Readonly<BrandHeaderProps>) {
  return (
    <View style={styles.header}>
      <BrandTitle />
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
  },
  action: { marginLeft: "auto", maxWidth: "100%" },
});
