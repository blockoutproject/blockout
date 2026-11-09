import { controlOpacity } from "../../../shared/components/control-styles";
import { Link } from "expo-router";
import { FileText } from "lucide-react-native";
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
import { useLegalDocuments } from "../../privacy/use-legal-documents";

/** Existing account consumers supply only known navigation or safe failed-sign-in facts. */
export interface PublicAccountLinksProps {
  supportOrigin?: SupportOrigin;
}

/** Public sign-in footer opens legal HTML in the native browser and retains the shared support route. */
export function PublicAccountLinks({
  supportOrigin = { screen: "profile" },
}: PublicAccountLinksProps = {}) {
  const open = useLegalDocuments();
  return (
    <View style={styles.links}>
      <PublicLinkAction
        label="Conditions d’utilisation"
        onPress={() => open("terms")}
      />
      <PublicLinkAction
        label="Politique de confidentialité"
        onPress={() => open("privacy")}
      />
      <Link href={supportHref(supportOrigin)} asChild>
        <PublicLinkAction label="Besoin d’aide ?" />
      </Link>
    </View>
  );
}

/** Existing profile grouping opens the three public documents independently of account and Pro status. */
export function ProfileLegalLinks() {
  const { colors } = useTheme();
  const open = useLegalDocuments();
  return (
    <View style={styles.legalGroup}>
      <EntryGroup>
        {(
          [
            { label: "Mentions légales", kind: "imprint" },
            { label: "Conditions d’utilisation", kind: "terms" },
            { label: "Politique de confidentialité", kind: "privacy" },
          ] as const
        ).map(({ label, kind }) => (
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
            onPress={() => open(kind)}
          />
        ))}
      </EntryGroup>
    </View>
  );
}

/** Preserves native support Link forwarding and the accessible browser-action semantics. */
function PublicLinkAction({
  label,
  ...props
}: PressableProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: props.disabled ?? false }}
      style={({ pressed }) => [
        styles.link,
        { opacity: controlOpacity(props.disabled, pressed) },
      ]}
    >
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
