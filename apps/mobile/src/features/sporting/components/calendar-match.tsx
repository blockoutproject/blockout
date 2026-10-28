import { useSportingNavigation } from "../navigation";
import { CircleAlert } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { divisionTextColor } from "../presentation";
import { formatSportingSchedule } from "../model/sporting-time";
import { SportingLogo } from "./sporting-identity";

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
}: CalendarMatchProps) {
  const { colors, context } = useTheme();
  const { fontScale } = useWindowDimensions();
  const sporting = useSportingNavigation(active);
  const division = match.pool.classification.division;
  const accent = division?.color ?? context.primary;
  const foreground = division ? divisionTextColor(accent) : context.onAction;
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
  const result = match.result;
  const hasScore =
    result?.homeSets !== undefined && result.awaySets !== undefined;
  const unavailable =
    match.category === "completed" && result?.state !== "final";
  const status = unavailable
    ? result?.state === "provisional"
      ? "Score provisoire · Résultat définitif indisponible"
      : result?.state === "unconfirmed"
        ? "Résultat non confirmé · Résultat définitif indisponible"
        : "Résultat indisponible"
    : result?.state === "provisional"
      ? "Score provisoire"
      : result?.state === "unconfirmed"
        ? "Résultat non confirmé"
        : undefined;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Ouvrir le match ${match.home.name} — ${match.away.name}, ${hasScore ? `${result.homeSets} à ${result.awaySets}` : schedule.time}${status ? `, ${status}` : ""}${result?.specialLabel ? `, ${result.specialLabel}` : ""}`}
      onPress={() => void sporting.navigate("match", match.id)}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: division
            ? `${accent}${colors.contextBorderAlpha}`
            : colors.border,
          backgroundColor: colors.raised,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
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
      <View style={styles.content}>
        <View style={styles.teams}>
          {[
            { team: match.home, score: result?.homeSets },
            { team: match.away, score: result?.awaySets },
          ].map(({ team, score }, index) => (
            <View
              key={team.id}
              style={[
                styles.team,
                index > 0 && {
                  borderTopWidth: tokens.border.thin,
                  borderColor: division
                    ? `${accent}${colors.contextBorderAlpha}`
                    : colors.border,
                },
              ]}
            >
              <SportingLogo identity={team} kind="team" size={32} />
              <Text style={[styles.name, { color: colors.text }]}>
                {team.name}
              </Text>
              {hasScore && (
                <View style={[styles.scoreCell, { backgroundColor: accent }]}>
                  <Text style={[styles.score, { color: foreground }]}>
                    {score}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {!hasScore && (
          <View
            style={[
              styles.time,
              { backgroundColor: accent, width: 56 * fontScale },
            ]}
          >
            <Text style={[styles.timeText, { color: foreground }]}>
              {match.schedule.instant ? schedule.time : "À définir"}
            </Text>
          </View>
        )}
      </View>
      {result?.specialLabel && (
        <Text style={[styles.special, { color: colors.secondaryText }]}>
          {result.specialLabel}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  status: {
    flexDirection: "row",
    gap: tokens.spacing.tight,
    alignItems: "center",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
  },
  note: { ...tokens.typography.metadata, flex: 1 },
  content: { flexDirection: "row", alignItems: "stretch" },
  teams: { flex: 1, minWidth: 0 },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: 56,
    padding: tokens.spacing.sm,
  },
  name: {
    ...tokens.typography.strong,
    flex: 1,
    minWidth: 0,
    textTransform: "uppercase",
  },
  scoreCell: {
    minWidth: 40,
    minHeight: 40,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { ...tokens.typography.navigation, textAlign: "center" },
  time: { width: 56, padding: tokens.spacing.xs, justifyContent: "center" },
  timeText: { ...tokens.typography.strong, textAlign: "center" },
  special: { ...tokens.typography.metadata, padding: tokens.spacing.sm },
});
