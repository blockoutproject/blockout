import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** A caller-authorized route destination with its full accessible label. */
export interface NavigationLinkProps {
  href: Href;
  label: string;
}

/** Bordered navigation action shared by administration destinations and contextual sporting editors. */
export function NavigationLink({ href, label }: NavigationLinkProps) {
  return (
    <Link href={href} asChild>
      <NavigationAction label={label} />
    </Link>
  );
}

/** Keeps native dynamic styles inside the child boundary because Router's Slot merges static styles. */
function NavigationAction({
  label,
  ...props
}: PressableProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <Text
        numberOfLines={2}
        style={[tokens.typography.strong, { color: colors.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: tokens.size.control.default,
    justifyContent: "center",
    padding: tokens.spacing.lg,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
});
