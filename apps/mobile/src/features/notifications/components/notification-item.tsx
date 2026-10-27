import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  MatchSurface,
  SportingLogo,
  SportingArtwork,
  DivisionPaint,
  divisionTextColor,
} from "../../sporting/notification-presentation";

/** The exact personal entry owns tap intent; list rendering never marks it read. */
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
  const division = row.division;
  const foreground = divisionTextColor(division.color);
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(row.createdAt));
  const result =
    row.match.result?.state === "final" ? row.match.result : undefined;
  const score = result?.homeSets !== undefined && result.awaySets !== undefined;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${row.title}. ${row.match.pool.pool.name}. ${row.match.home.name}${score ? ` ${result.homeSets}` : ""}, ${row.match.away.name}${score ? ` ${result.awaySets}` : ""}. ${date} — ${row.read ? "lue" : "non lue"}`}
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
            <Text style={[tokens.typography.strong, { color: foreground }]}>
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
            {[
              { team: row.match.home, value: result?.homeSets },
              { team: row.match.away, value: result?.awaySets },
            ].map(({ team, value }, index) => (
              <View key={index} style={styles.team}>
                <Text style={[styles.teamName, { color: colors.text }]}>
                  {team.name}
                </Text>
                {score && (
                  <View
                    style={[styles.score, { backgroundColor: colors.subtle }]}
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
  identity: { flex: 1, gap: tokens.spacing.xs, minWidth: 0 },
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
    minWidth: tokens.size.control.compact,
    minHeight: tokens.size.control.compact,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
