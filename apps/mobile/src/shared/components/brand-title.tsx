import { StyleSheet, Text } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { membershipColors, tokens } from "@/shared/theme/tokens";

export function BrandTitle({ pro = false }: Readonly<{ pro?: boolean }>) {
  const { colors, scheme } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      accessibilityLabel={pro ? "Blockout Pro" : "Blockout"}
      numberOfLines={1}
      ellipsizeMode="tail"
      style={[styles.title, { color: colors.text }]}
    >
      Blockout
      {pro && (
        <Text style={{ color: membershipColors.pro[scheme].text }}>
          {" Pro"}
        </Text>
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    ...tokens.typography.headingXl,
    minWidth: 0,
    maxWidth: "100%",
    flexShrink: 1,
  },
});
