import { Link } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
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
      <Link
        href="/legals/privacy"
        style={[styles.link, { color: colors.secondaryText }]}
      >
        <Image
          accessible={false}
          source={require("../../../../assets/icons/privacy.svg")}
          tintColor={colors.icon}
          style={styles.icon}
          contentFit="contain"
        />
        <Text> Confidentialité</Text>
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
  icon: { width: 20, height: 20 },
});
