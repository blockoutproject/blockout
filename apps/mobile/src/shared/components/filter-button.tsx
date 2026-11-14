import { Image } from "expo-image";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export function FilterButton({
  active,
  onPress,
}: Readonly<{
  active: boolean;
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const size = Math.max(
    tokens.size.control.default,
    tokens.typography.body.lineHeight * fontScale + tokens.spacing.md * 2,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? "Filtres actifs" : "Filtres"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          width: size,
          minHeight: size,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Image
        accessible={false}
        source={require("../../../assets/discovery/filter.svg")}
        tintColor={colors.icon}
        contentFit="contain"
        style={styles.icon}
      />
      {active && (
        <View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              backgroundColor: colors.accentPrimary,
              borderColor: colors.surface,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  // Product Design 4346:7264: 7-point dot with a 2-point surface ring.
  indicator: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: tokens.radius.full,
    borderWidth: tokens.spacing.optical,
  },
});
