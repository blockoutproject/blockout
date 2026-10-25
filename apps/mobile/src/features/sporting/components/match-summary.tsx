import { StyleSheet, Text, View } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ResourceCard, ResourceText } from "./resource-page";
import { DivisionPaint, SportingLink } from "./sporting-identity";
import { formatSportingSchedule } from "../model/sporting-time";

/** Accepted result facts only; missing totals and provisional/special finality remain explicit. */
export interface MatchSummaryProps {
  match: MatchSummaryResponse;
  /** Current phone zone for text only; a calendar retains its separate loading-zone day groups. */
  displayTimeZone?: string;
}

/** Shared match identity/result surface without winner, live-state or zero-score inference. */
export function MatchSummary({ match, displayTimeZone }: MatchSummaryProps) {
  const { colors } = useTheme();
  const result = match.result;
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
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
      {match.pool.competitionName && (
        <ResourceText>{match.pool.competitionName}</ResourceText>
      )}
      {match.pool.classification.division && (
        <ResourceText>{match.pool.classification.division.name}</ResourceText>
      )}
      <ResourceText>{match.pool.phaseName}</ResourceText>
      <ResourceText>
        {match.schedule.instant
          ? `${schedule.date} · ${schedule.time}`
          : schedule.date}
      </ResourceText>
      {!match.schedule.instant && <ResourceText>{schedule.time}</ResourceText>}
      {[
        { team: match.home, score: result?.homeSets, side: "domicile" },
        { team: match.away, score: result?.awaySets, side: "extérieur" },
      ].map(({ team, score, side }) => (
        <View key={side} style={styles.team}>
          <View style={styles.identity}>
            <SportingLink
              kind="team"
              id={team.id}
              identity={team}
              label={team.name}
            />
          </View>
          <Text
            accessibilityLabel={`Score ${side} : ${score ?? "indisponible"}`}
            style={[styles.score, { color: colors.text }]}
          >
            {score ?? "—"}
          </Text>
        </View>
      ))}
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
