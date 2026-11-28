import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import { controlOpacity } from "@/shared/components/control-styles";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export function CollectionLink({
  label,
  accessibilityHint,
  onPress,
  centered = false,
}: Readonly<{
  label: string;
  accessibilityHint?: string;
  onPress: () => void;
  centered?: boolean;
}>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        centered ? styles.centered : styles.trailing,
        { opacity: controlOpacity(false, pressed) },
      ]}
    >
      <Text
        style={[
          styles.label,
          centered && styles.centeredLabel,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
      <ChevronRight
        accessible={false}
        size={tokens.size.icon.sm}
        color={colors.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  centered: { justifyContent: "center" },
  trailing: { marginLeft: "auto" },
  label: { ...tokens.typography.strong, flexShrink: 1 },
  centeredLabel: { textAlign: "center" },
});
