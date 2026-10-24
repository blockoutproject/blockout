import { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { ResourceText } from "./resource-page";

/** Accepts only published HTTP(S) destinations without credentials; malformed values remain plain text. */
export function safeWebsite(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

/** Preserves the effective phone's digits and leading plus without allowing dial-service instructions. */
export function phoneDestination(value?: string): string | undefined {
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return undefined;
  const number = value.replace(/[\s().-]/g, "");
  return /\d/.test(number) ? `tel:${number}` : undefined;
}

/** Native platform map action from exact accepted coordinates or a known venue address. */
export function mapDestination(query: string): string {
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
    : `geo:0,0?q=${encodeURIComponent(query)}`;
}

/** Known value and its optional safe destination; absent values are explicitly unavailable. */
export interface ContactLinkProps {
  label: string;
  value?: string;
  destination?: string;
  icon: LucideIcon;
}

/** Whole-row native link with honest opening failure; a later explicit press is the only retry. */
export function ContactLink({
  label,
  value,
  destination,
  icon: Icon,
}: ContactLinkProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: colors.canvas }]}>
        <Icon accessible={false} size={20} color={colors.icon} />
      </View>
      <View style={styles.value}>
        <ResourceText>{label}</ResourceText>
        <Text
          style={[
            value ? styles.known : styles.unknown,
            { color: value ? colors.text : colors.secondaryText },
          ]}
        >
          {value ?? "Non renseigné"}
        </Text>
      </View>
      {destination && (
        <ChevronRight accessible={false} size={16} color={colors.icon} />
      )}
    </>
  );
  return (
    <View>
      {destination ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${label} : ${value}`}
          onPress={async () => {
            setFailed(false);
            try {
              await Linking.openURL(destination);
            } catch {
              setFailed(true);
            }
          }}
          style={styles.row}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
      {failed && (
        <Text
          accessibilityRole="alert"
          style={[styles.unknown, { color: colors.error }]}
        >
          Impossible d’ouvrir ce lien. Vous pouvez réessayer.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
  },
  value: { flex: 1, gap: tokens.spacing.xs },
  known: { ...tokens.typography.strong },
  unknown: { ...tokens.typography.body },
});
