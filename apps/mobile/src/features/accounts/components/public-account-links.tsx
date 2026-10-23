import { Link } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Public navigation handoffs; F10/F11 retain their destination content and global F12 guards. */
export function PublicAccountLinks() {
  const { colors } = useTheme();
  return (
    <View style={styles.links}>
      <Link
        href="/legals/terms"
        style={[styles.link, { color: colors.secondaryText }]}
      >
        Conditions d’utilisation
      </Link>
      <Link href="/legals/privacy" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Confidentialité"
          style={styles.privacyLink}
        >
          <ShieldCheck
            accessible={false}
            size={20}
            color={colors.icon}
            nonScalingStroke
          />
          <Text style={[styles.privacyLabel, { color: colors.secondaryText }]}>
            Confidentialité
          </Text>
        </Pressable>
      </Link>
      <Link
        href="/support"
        style={[styles.link, { color: colors.secondaryText }]}
      >
        Besoin d’aide ?
      </Link>
    </View>
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
    ...tokens.typography.metadata,
    textDecorationLine: "underline",
    padding: tokens.spacing.sm,
    minHeight: 48,
    minWidth: 44,
    maxWidth: 240,
    textAlign: "center",
  },
  privacyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    minHeight: 48,
    minWidth: 44,
    maxWidth: 240,
  },
  privacyLabel: {
    ...tokens.typography.metadata,
    textDecorationLine: "underline",
    flexShrink: 1,
    textAlign: "center",
  },
});
