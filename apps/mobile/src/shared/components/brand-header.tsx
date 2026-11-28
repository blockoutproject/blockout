import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { BrandTitle } from "./brand-title";

interface BrandHeaderProps {
  children?: ReactNode;
  pro?: boolean;
}

/** Shares the title row across Home, discovery and admission. The host positions it below the native safe area. */
export function BrandHeader({ children, pro }: Readonly<BrandHeaderProps>) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <BrandTitle pro={pro} />
      </View>
      {children && <View style={styles.action}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: tokens.spacing.screen,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacing.sm,
    rowGap: tokens.spacing.md,
  },
  // Keep the first row centered at the same height when a narrow screen wraps trailing actions.
  brand: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: tokens.layout.header,
    justifyContent: "center",
  },
  action: { marginLeft: "auto", maxWidth: "100%" },
});
