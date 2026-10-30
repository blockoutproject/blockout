import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { Link } from "expo-router";
import type { StreamModerationMatchResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  MatchSurface,
  SportingLogo,
  DivisionPaint,
  formatSportingSchedule,
} from "../../sporting/match-consultation";

/** Retained private context preserves unknown date and independent public viewability. */
export interface ModerationMatchContextProps {
  match: StreamModerationMatchResponse;
}
/** Uses F03 sporting identities/paint without constructing its public dated-match wrapper. */
export function ModerationMatchContext({ match }: ModerationMatchContextProps) {
  const { colors, context } = useTheme();
  const division = match.pool.classification.division;
  const schedule = match.schedule
    ? formatSportingSchedule(match.schedule)
    : undefined;
  return (
    <MatchSurface division={division}>
      <View
        style={[
          styles.ribbon,
          { backgroundColor: division?.color ?? context.primary },
        ]}
      >
        {division && (
          <>
            <DivisionPaint division={division} />
            <SportingLogo kind="division" identity={division} />
          </>
        )}
        <Text
          style={[
            tokens.typography.strong,
            { color: colors.onDarkAccent, flex: 1 },
          ]}
        >
          {match.pool.pool.name}
        </Text>
        {match.publiclyViewable && (
          <Link
            href={{
              pathname: "/matches/[matchId]",
              params: { matchId: match.id },
            }}
            asChild
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Voir le match"
              style={styles.open}
            >
              <ArrowUpRight
                size={tokens.size.icon.md}
                color={colors.onDarkAccent}
              />
            </Pressable>
          </Link>
        )}
      </View>
      <View style={styles.body}>
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          {schedule ? `${schedule.date} ${schedule.time}` : "Date indisponible"}
        </Text>
        {[
          { team: match.home, score: match.result?.homeSets },
          { team: match.away, score: match.result?.awaySets },
        ].map(({ team, score }) => (
          <View key={team.id} style={styles.team}>
            <SportingLogo kind="team" identity={team} />
            <Text
              style={[
                tokens.typography.strong,
                { color: colors.text, flex: 1 },
              ]}
            >
              {team.name}
            </Text>
            {score !== undefined && (
              <Text style={[tokens.typography.heading, { color: colors.text }]}>
                {score}
              </Text>
            )}
          </View>
        ))}
        {!match.publiclyViewable && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Match non consultable publiquement
          </Text>
        )}
      </View>
    </MatchSurface>
  );
}
const styles = StyleSheet.create({
  ribbon: {
    padding: tokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  body: { padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  team: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  open: {
    minWidth: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
});
