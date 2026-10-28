import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  MatchSurface,
  SportingLogo,
  SportingArtwork,
  DivisionPaint,
  divisionTextColor,
  currentSportingTimeZone,
  formatSportingTime,
} from "../../sporting/notification-presentation";

/** Validated current entry and exact tap intent; pending blocks repetition without changing its read state. */
export interface NotificationItemProps {
  notification: NotificationResponse;
  onPress: () => void;
  pending?: boolean;
}

/** F07 Pattern 512:6869: stable wording, current teams/result, received instant and accessible read state. */
export function NotificationItem({
  notification: row,
  onPress,
  pending = false,
}: NotificationItemProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Approved normal/large score slots are 36/48 points; text keeps native scaling beyond those minima.
  const scoreSize =
    fontScale >= 1.5
      ? tokens.size.control.default
      : tokens.size.control.compact;
  const division = row.division;
  const foreground = divisionTextColor(division.color);
  const timeZone = currentSportingTimeZone();
  const receivedDay = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(row.createdAt));
  const date = `${receivedDay} à ${formatSportingTime(row.createdAt, timeZone)}`;
  const result =
    row.match.result?.state === "final" ? row.match.result : undefined;
  const score = result?.homeSets !== undefined && result.awaySets !== undefined;
  const teams = [
    { name: row.match.home.name, value: result?.homeSets, side: "domicile" },
    { name: row.match.away.name, value: result?.awaySets, side: "extérieur" },
  ].map((team) => ({
    ...team,
    name: team.name.trim() ? team.name : "Nom indisponible",
  }));
  const teamDescription = teams
    .map(
      ({ name, value, side }) =>
        `${name}${score ? `, Score ${side} : ${value}` : ""}`,
    )
    .join(". ");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${row.title} ${row.match.pool.pool.name}. ${teamDescription}. ${date} — ${row.read ? "lue" : "non lue"}`}
      accessibilityHint="Ouvrir la fiche du match"
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? tokens.opacity.pressed : 1,
      })}
    >
      <MatchSurface division={division}>
        <View style={[styles.header, { backgroundColor: division.color }]}>
          <DivisionPaint division={division} />
          <SportingArtwork division={division} />
          <SportingLogo kind="division" identity={division} />
          <View style={styles.identity}>
            <Text
              numberOfLines={1}
              style={[tokens.typography.strong, { color: foreground }]}
            >
              {row.match.pool.pool.name}
            </Text>
            <Text style={[tokens.typography.metadata, { color: foreground }]}>
              {date}
            </Text>
          </View>
          {!row.read && (
            <View
              accessible={false}
              style={[styles.dot, { backgroundColor: colors.secondaryText }]}
            />
          )}
        </View>
        <View style={styles.body}>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            {row.title}
          </Text>
          <View style={styles.teams}>
            {teams.map(({ name, value, side }) => (
              <View key={side} style={styles.team}>
                <Text style={[styles.teamName, { color: colors.text }]}>
                  {name}
                </Text>
                {score && (
                  <View
                    style={[
                      styles.score,
                      {
                        backgroundColor: colors.subtle,
                        minWidth: scoreSize,
                        minHeight: scoreSize,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        tokens.typography.navigation,
                        { color: colors.text },
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </MatchSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    overflow: "hidden",
  },
  identity: { flex: 1, gap: tokens.spacing.optical, minWidth: 0 },
  dot: {
    width: tokens.spacing.sm,
    height: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  body: { padding: tokens.spacing.md, gap: tokens.spacing.sm },
  teams: { gap: tokens.spacing.sm },
  team: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  teamName: { ...tokens.typography.strong, flex: 1 },
  score: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.optical,
    alignItems: "center",
    justifyContent: "center",
  },
});
