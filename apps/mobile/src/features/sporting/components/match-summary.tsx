import { StyleSheet, Text, View } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ResourceCard, ResourceText } from "./resource-page";
import { DivisionPaint, SportingLink } from "./sporting-identity";

/** Accepted result facts only; missing totals and provisional/special finality remain explicit. */
export interface MatchSummaryProps {
  match: MatchSummaryResponse;
}

/** Shared match identity/result surface without winner, live-state or zero-score inference. */
export function MatchSummary({ match }: MatchSummaryProps) {
  const { colors } = useTheme();
  const result = match.result;
  return (
    <ResourceCard>
      <View style={styles.pool}>
        <DivisionPaint division={match.pool.classification.division} />
        <View style={[styles.poolSurface, { backgroundColor: colors.surface }]}>
          <SportingLink
            kind="pool"
            id={match.pool.pool.id}
            label={match.pool.pool.name}
            identity={match.pool.classification.division}
          />
        </View>
      </View>
      <ResourceText>{match.pool.season.label}</ResourceText>
      <ResourceText>{match.pool.phaseName}</ResourceText>
      <ResourceText>
        {match.schedule.instant
          ? new Date(match.schedule.instant).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : match.schedule.localDate}
      </ResourceText>
      {!match.schedule.instant && (
        <ResourceText>Horaire à confirmer</ResourceText>
      )}
      <View style={styles.team}>
        <View style={styles.identity}>
          <SportingLink
            kind="team"
            id={match.home.id}
            identity={match.home}
            label={match.home.name}
          />
        </View>
        <Text
          accessibilityLabel={`Score domicile : ${result?.homeSets ?? "indisponible"}`}
          style={[styles.score, { color: colors.text }]}
        >
          {result?.homeSets ?? "—"}
        </Text>
      </View>
      <View style={styles.team}>
        <View style={styles.identity}>
          <SportingLink
            kind="team"
            id={match.away.id}
            identity={match.away}
            label={match.away.name}
          />
        </View>
        <Text
          accessibilityLabel={`Score extérieur : ${result?.awaySets ?? "indisponible"}`}
          style={[styles.score, { color: colors.text }]}
        >
          {result?.awaySets ?? "—"}
        </Text>
      </View>
      <ResourceText>
        {!result
          ? "Résultat indisponible"
          : result.state === "provisional"
            ? "Résultat provisoire · Résultat définitif indisponible"
            : result.state === "unconfirmed"
              ? "Résultat non confirmé · Résultat définitif indisponible"
              : "Résultat définitif"}
      </ResourceText>
      {result?.specialLabel && (
        <ResourceText>{result.specialLabel}</ResourceText>
      )}
    </ResourceCard>
  );
}

const styles = StyleSheet.create({
  pool: {
    overflow: "hidden",
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.xs,
  },
  poolSurface: {
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.control,
  },
  team: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.md },
  identity: { flex: 1 },
  score: { ...tokens.typography.heading, minWidth: 40, textAlign: "center" },
});
