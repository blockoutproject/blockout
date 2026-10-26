import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

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
  icon?: LucideIcon;
  /** Match information uses the approved compact label/value row rather than a contact tile. */
  presentation?: "contact" | "information";
}

/** Approved match-information row; an explicit host action alone makes it a navigation control. */
export interface InformationRowProps {
  label: string;
  value: string;
  supporting?: string;
  icon?: LucideIcon;
  onPress?: () => void;
  pending?: boolean;
  separated?: boolean;
}

/** Label/value composition from Product Design 4388:37876, retaining wrapping and whole-row access. */
export function InformationRow({
  label,
  value,
  supporting,
  icon: Icon,
  onPress,
  pending = false,
  separated = true,
}: InformationRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <Text style={[styles.informationLabel, { color: colors.secondaryText }]}>
        {label}
      </Text>
      <View style={styles.informationValue}>
        {Icon && (
          <Icon
            accessible={false}
            size={tokens.size.icon.sm}
            color={colors.icon}
          />
        )}
        <View style={[styles.value, styles.informationCopy]}>
          <Text style={[styles.known, { color: colors.text }]}>{value}</Text>
          {supporting && (
            <Text style={[styles.label, { color: colors.secondaryText }]}>
              {supporting}
            </Text>
          )}
        </View>
      </View>
      {onPress && (
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      )}
    </>
  );
  const name = `${label} : ${[value, supporting].filter(Boolean).join(" · ")}`;
  return (
    <View>
      {separated && (
        <View
          accessible={false}
          style={[
            styles.informationSeparator,
            { backgroundColor: colors.border },
          ]}
        />
      )}
      {onPress ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={name}
          onPress={onPress}
          disabled={pending}
          accessibilityState={{ disabled: pending, busy: pending }}
          style={({ pressed }) => [
            styles.informationRow,
            {
              opacity: pending
                ? tokens.opacity.disabled
                : pressed
                  ? tokens.opacity.pressed
                  : 1,
            },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={name}
          style={styles.informationRow}
        >
          {content}
        </View>
      )}
    </View>
  );
}

/** Whole-row native link with honest opening failure; a later explicit press is the only retry. */
export function ContactLink(props: ContactLinkProps) {
  return <ContactHandoff key={props.destination} {...props} />;
}

/** Keeps native failure with one mounted destination; changing it discards old feedback and late completion. */
function ContactHandoff({
  label,
  value,
  destination,
  icon: Icon,
  presentation = "contact",
}: ContactLinkProps) {
  const { colors } = useTheme();
  const handoff = useNativeHandoff(destination);
  const content = (
    <>
      {Icon && (
        <View style={[styles.icon, { backgroundColor: colors.canvas }]}>
          <Icon
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
          />
        </View>
      )}
      <View style={styles.value}>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          {label}
        </Text>
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
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      )}
    </>
  );
  return (
    <View>
      {presentation === "information" ? (
        <InformationRow
          label={label}
          value={value ?? "Non renseigné"}
          icon={Icon}
          onPress={destination ? handoff.open : undefined}
          pending={handoff.pending}
        />
      ) : destination ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${label} : ${value}`}
          onPress={handoff.open}
          disabled={handoff.pending}
          accessibilityState={{
            disabled: handoff.pending,
            busy: handoff.pending,
          }}
          style={({ pressed }) => [
            styles.row,
            {
              opacity: handoff.pending
                ? tokens.opacity.disabled
                : pressed
                  ? tokens.opacity.pressed
                  : 1,
            },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  informationRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.compact,
    gap: tokens.spacing.compact,
  },
  informationLabel: {
    ...tokens.typography.metadata,
    width: tokens.sporting.informationLabelWidth,
  },
  informationValue: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  informationCopy: { gap: tokens.spacing.optical },
  informationSeparator: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: tokens.border.thin,
  },
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
  label: { ...tokens.typography.metadata },
  unknown: { ...tokens.typography.body },
});
