import { Link } from "expo-router";
import { FileText, ShieldCheck } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { EntryRow } from "../../../shared/components/entry-row";
import { EntryGroup } from "../../../shared/components/entry-group";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { supportHref, type SupportOrigin } from "../../support";

/** Existing account consumers supply only known navigation or safe failed-sign-in facts. */
export interface PublicAccountLinksProps {
  supportOrigin?: SupportOrigin;
}

/** Footer navigation retains support; F11 owns future browser-backed legal documents, so no fictitious route is activated. */
export function PublicAccountLinks({
  supportOrigin = { screen: "profile" },
}: PublicAccountLinksProps = {}) {
  return (
    <View style={styles.links}>
      <PublicLinkAction label="Conditions d’utilisation" disabled />
      <PublicLinkAction label="Politique de confidentialité" privacy disabled />
      <Link href={supportHref(supportOrigin)} asChild>
        <PublicLinkAction label="Besoin d’aide ?" />
      </Link>
    </View>
  );
}

/** Approved overview grouping; document actions stay explicitly unavailable until F11 supplies verified documents and browser entry. */
export function ProfileLegalLinks() {
  const { colors } = useTheme();
  return (
    <View style={styles.legalGroup}>
      <EntryGroup>
        {[
          "Mentions légales",
          "Conditions d’utilisation",
          "Politique de confidentialité",
        ].map((label) => (
          <EntryRow
            key={label}
            label={label}
            accessibilityRole="link"
            icon={
              <FileText
                accessible={false}
                size={tokens.size.icon.md}
                color={colors.icon}
              />
            }
            disclosure
            disabled
          />
        ))}
      </EntryGroup>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Documents indisponibles pour le moment.
      </Text>
    </View>
  );
}

/** Preserves the native Link target while giving inactive legal entries their actual disabled semantics. */
function PublicLinkAction({
  label,
  privacy = false,
  ...props
}: PressableProps & { label: string; privacy?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: props.disabled ?? false }}
      style={({ pressed }) => [
        styles.link,
        {
          opacity: props.disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      {privacy && (
        <ShieldCheck
          accessible={false}
          size={tokens.size.icon.md}
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
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    maxWidth: "100%",
  },
  label: {
    ...tokens.typography.metadata,
    textDecorationLine: "underline",
    flexShrink: 1,
    textAlign: "center",
  },
  legalGroup: { gap: tokens.spacing.sm },
});
