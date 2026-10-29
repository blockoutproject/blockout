import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Flat information and form grouping shared by resource, preparation, account and administration screens. */
export function Surface({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.surface,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.layout.surface.inset,
    gap: tokens.spacing.md,
    overflow: "hidden",
  },
});
