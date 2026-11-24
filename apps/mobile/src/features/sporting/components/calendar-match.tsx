import { CircleAlert } from "lucide-react-native";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { divisionTextColor } from "../presentation";
import { SportingLink } from "../link";
import { formatSportingTime } from "../model/sporting-time";
import { SportingLogo } from "./sporting-identity";
import { calendarStyles } from "./calendar-styles";

/** Compact calendar row retains server classification and opens the exact encounter. */
export interface CalendarMatchProps {
  match: MatchSummaryResponse;
  displayTimeZone: string;
  /** Mounted native tabs retain their rows; only the active tab can continue an accepted opening. */
  active?: boolean;
}

/** Approved Match Row: full-width result indication, team rows, then time or supplied scores. */
export function CalendarMatch({
  match,
  displayTimeZone,
  active = true,
}: Readonly<CalendarMatchProps>) {
  const { colors, context } = useTheme();
  const { fontScale } = useWindowDimensions();
  const division = match.pool.classification.division;
  const accent = division?.color ?? context.primary;
  const borderColor = division
    ? `${accent}${colors.contextBorderAlpha}`
    : colors.border;
  const foreground = division ? divisionTextColor(accent) : context.onAction;
  const result = match.result;
  const hasScore =
    result?.homeSets !== undefined && result.awaySets !== undefined;
  const instant = match.schedule.instant;
  const time =
    !hasScore && instant
      ? formatSportingTime(instant, displayTimeZone)
      : undefined;
  const scoreOrTime = hasScore
    ? `${result.homeSets} à ${result.awaySets}`
    : (time ?? "Heure à définir");
  const unavailable =
    match.category === "completed" && result?.state !== "final";
  let status;
  if (unavailable) {
    if (result?.state === "provisional") {
      status = "Score provisoire · Résultat définitif indisponible";
    } else if (result?.state === "unconfirmed") {
      status = "Résultat non confirmé · Résultat définitif indisponible";
    } else {
      status = "Résultat indisponible";
    }
  } else if (result?.state === "provisional") {
    status = "Score provisoire";
  } else if (result?.state === "unconfirmed") {
    status = "Résultat non confirmé";
  } else {
    status = undefined;
  }
  const encounter = `${match.home.name} — ${match.away.name}`;
  const matchLabel = `Ouvrir le match ${encounter}, ${scoreOrTime}${status ? `, ${status}` : ""}${result?.specialLabel ? `, ${result.specialLabel}` : ""}`;
  return (
    <SportingLink
      kind="match"
      id={match.id}
      label={matchLabel}
      active={active}
      style={[
        calendarStyles.matchCard,
        { borderColor, backgroundColor: colors.raised },
      ]}
    >
      {status && (
        <View style={[styles.status, { backgroundColor: colors.inverse }]}>
          <CircleAlert
            accessible={false}
            size={tokens.size.icon.sm}
            color={colors.onInverse}
          />
          <Text style={[styles.note, { color: colors.onInverse }]}>
            {status}
          </Text>
        </View>
      )}
      <View style={calendarStyles.matchContent}>
        <View style={calendarStyles.matchTeams}>
          {[
            { team: match.home, score: result?.homeSets },
            { team: match.away, score: result?.awaySets },
          ].map(({ team, score }, index) => (
            <View
              key={team.id}
              style={[
                calendarStyles.matchTeam,
                styles.matchTeamRow,
                index > 0 && {
                  borderTopWidth: tokens.border.thin,
                  borderColor,
                },
              ]}
            >
              <View style={styles.teamIdentity}>
                <SportingLogo
                  identity={team}
                  kind="team"
                  size={tokens.size.media.match}
                />
                <Text style={[styles.name, { color: colors.text }]}>
                  {team.name}
                </Text>
              </View>
              {hasScore && (
                <View style={styles.scoreSlot}>
                  <View style={[styles.scoreCell, { backgroundColor: accent }]}>
                    <Text style={[styles.score, { color: foreground }]}>
                      {score}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
        {!hasScore && (
          <View
            style={[
              calendarStyles.matchTime,
              {
                backgroundColor: accent,
                width: tokens.sporting.calendarMatch.timeWidth * fontScale,
              },
            ]}
          >
            <Text style={[styles.timeText, { color: foreground }]}>
              {time ?? "À définir"}
            </Text>
          </View>
        )}
      </View>
      {result?.specialLabel && (
        <Text style={[styles.special, { color: colors.secondaryText }]}>
          {result.specialLabel}
        </Text>
      )}
    </SportingLink>
  );
}

const styles = StyleSheet.create({
  matchTeamRow: { paddingVertical: 0 },
  teamIdentity: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  scoreSlot: {
    minWidth: tokens.touch.minimum,
    paddingVertical: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    flexDirection: "row",
    gap: tokens.spacing.tight,
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
  },
  note: { ...tokens.typography.metadata, flex: 1 },
  name: {
    ...tokens.typography.strong,
    flex: 1,
    minWidth: 0,
    textTransform: "uppercase",
  },
  scoreCell: {
    minWidth: tokens.sporting.scoreSize,
    minHeight: tokens.sporting.scoreSize,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { ...tokens.typography.navigation, textAlign: "center" },
  timeText: { ...tokens.typography.strong, textAlign: "center" },
  special: { ...tokens.typography.metadata, padding: tokens.spacing.sm },
});
