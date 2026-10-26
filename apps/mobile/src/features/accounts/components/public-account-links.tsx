import { Link } from "expo-router";
import { ShieldCheck, type LucideIcon } from "lucide-react-native";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

const destinations = [
  { href: "/legals/terms", label: "Conditions d’utilisation", icon: undefined },
  { href: "/legals/privacy", label: "Confidentialité", icon: ShieldCheck },
  { href: "/support", label: "Besoin d’aide ?", icon: undefined },
] as const;

/** Public links share native targets and label alignment; F10/F11 retain destinations and F12 guards. */
export function PublicAccountLinks() {
  return (
    <View style={styles.links}>
      {destinations.map(({ href, label, icon }) => (
        <Link key={href} href={href} asChild>
          <PublicLinkAction label={label} icon={icon} />
        </Link>
      ))}
    </View>
  );
}

/** Preserves Link activation while keeping dynamic native styles outside Router's static Slot merge. */
function PublicLinkAction({
  label,
  icon: Icon,
  ...props
}: PressableProps & { label: string; icon?: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.link,
        { opacity: pressed ? tokens.opacity.pressed : 1 },
      ]}
    >
      {Icon && (
        <Icon
          accessible={false}
          size={tokens.size.controlIcon}
          color={colors.icon}
          nonScalingStroke
        />
      )}
      <Text style={[styles.label, { color: colors.secondaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: tokens.spacing.xs,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    minHeight:
      Platform.OS === "android"
        ? tokens.touchTarget.android
        : tokens.touchTarget.ios,
    minWidth:
      Platform.OS === "android"
        ? tokens.touchTarget.android
        : tokens.touchTarget.ios,
    maxWidth: "100%",
  },
  label: {
    ...tokens.typography.metadata,
    textDecorationLine: "underline",
    flexShrink: 1,
    textAlign: "center",
  },
});
