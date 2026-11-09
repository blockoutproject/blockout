import { CalendarDays } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Canonical season identity in the preparation context; never inferred from a provider identifier. */
export function SeasonIdentity({
  season,
}: Readonly<{
  season: CollectionSeasonResponse;
}>) {
  const { colors } = useTheme();
  return (
    <View style={styles.link}>
      <CalendarDays
        accessible={false}
        size={tokens.size.icon.lg}
        color={colors.icon}
      />
      <View>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Saison
        </Text>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {season.label}
        </Text>
      </View>
    </View>
  );
}

/** Source lifecycle labels prioritize immutable bindings over candidate qualification. */
export function sourceStatus(source: SourceBindingResponse) {
  if (source.locked || source.launched) {
    return "Verrouillée";
  }
  if (!source.candidateUrl) {
    return "Source manquante";
  }
  return {
    unvalidated: "À valider",
    pending: "Validation en attente",
    invalid: "Source indisponible",
    "confirmation-required": "À confirmer",
    qualified: "Prête",
  }[source.validation];
}

/** Canonical season lifecycle copy, distinct from source readiness and running collection. */
export function seasonStatus(season: CollectionSeasonResponse) {
  return { preparing: "À préparer", active: "Active", closed: "Clôturée" }[
    season.state
  ];
}

/** Noninteractive source evidence badge with approved semantic warning, success, information and error paints. */
export function SourceBadge({
  source,
}: Readonly<{ source: SourceBindingResponse }>) {
  const { colors } = useTheme();
  const locked = source.locked || source.launched;
  let foreground = colors.onWarning;
  let backgroundColor = colors.warning;
  if (locked) {
    foreground = colors.onInfo;
    backgroundColor = colors.info;
  } else if (source.validation === "qualified") {
    foreground = colors.onSuccessAction;
    backgroundColor = colors.successAction;
  } else if (source.validation === "invalid") {
    foreground = colors.error;
    backgroundColor = colors.errorSubtle;
  }
  return (
    <Text style={[styles.badge, { color: foreground, backgroundColor }]}>
      {sourceStatus(source)}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
});
