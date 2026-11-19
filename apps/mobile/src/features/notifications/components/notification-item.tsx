import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { LoadingIndicator } from "@/shared/components/loading-indicator";
import { SportingLink } from "@/features/sporting/link";
import {
  MatchSurface,
  SportingLogo,
  SportingArtwork,
  DivisionPaint,
  divisionTextColor,
  currentSportingTimeZone,
  formatSportingTime,
} from "@/features/sporting/notification-presentation";

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
}: Readonly<NotificationItemProps>) {
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
  const pool = row.match.pool.pool;
  const teams = [
    { identity: row.match.home, value: result?.homeSets, side: "domicile" },
    { identity: row.match.away, value: result?.awaySets, side: "extérieur" },
  ];
  const teamDescription = teams
    .map(
      ({ identity, value, side }) =>
        `${identity.name.trim() || "Nom indisponible"}${score ? `, Score ${side} : ${value}` : ""}`,
    )
    .join(". ");
  return (
    <MatchSurface division={division}>
      <View style={[styles.header, { backgroundColor: division.color }]}>
        <DivisionPaint division={division} />
        <SportingArtwork division={division} />
        <SportingLink
          kind="pool"
          id={pool.id}
          label={`Voir la poule ${pool.name}`}
          active={!pending}
          style={styles.pool}
        >
          <SportingLogo kind="division" identity={division} />
          <View style={styles.identity}>
            <Text
              numberOfLines={1}
              style={[tokens.typography.strong, { color: foreground }]}
            >
              {pool.name}
            </Text>
            <Text style={[tokens.typography.metadata, { color: foreground }]}>
              {date}
            </Text>
          </View>
          <ChevronRight
            accessible={false}
            size={tokens.size.icon.sm}
            color={foreground}
          />
        </SportingLink>
        <View style={styles.status}>
          {pending ? (
            <LoadingIndicator color={foreground} />
          ) : (
            !row.read && (
              <View
                accessible={false}
                style={[styles.dot, { backgroundColor: colors.secondaryText }]}
              />
            )
          )}
        </View>
      </View>
      <View style={styles.body}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${row.title} ${pool.name}. ${teamDescription}. ${date} — ${row.read ? "lue" : "non lue"}`}
          accessibilityHint="Ouvrir la fiche du match"
          accessibilityState={{ disabled: pending, busy: pending }}
          disabled={pending}
          onPress={onPress}
          style={({ pressed }) => [
            styles.match,
            { opacity: pressed ? tokens.opacity.pressed : 1 },
          ]}
        >
          <Text
            style={[
              tokens.typography.body,
              styles.copy,
              { color: colors.text },
            ]}
          >
            {row.title}
          </Text>
          <ChevronRight
            accessible={false}
            size={tokens.size.icon.sm}
            color={colors.icon}
          />
        </Pressable>
        <View style={styles.teams}>
          {teams.map(({ identity, value, side }) => {
            const name = identity.name.trim();
            const title = (
              <Text
                style={[
                  tokens.typography.strong,
                  styles.copy,
                  { color: colors.text },
                ]}
              >
                {name || "Nom indisponible"}
              </Text>
            );
            return (
              <View key={side} style={styles.team}>
                {name ? (
                  <SportingLink
                    kind="team"
                    id={identity.id}
                    label={`Voir l’équipe ${name}`}
                    active={!pending}
                    style={styles.teamLink}
                  >
                    {title}
                    <ChevronRight
                      accessible={false}
                      size={tokens.size.icon.sm}
                      color={colors.icon}
                    />
                  </SportingLink>
                ) : (
                  <View style={styles.teamLink}>{title}</View>
                )}
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
            );
          })}
        </View>
      </View>
    </MatchSurface>
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
  pool: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  status: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: tokens.spacing.sm,
    height: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  body: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  copy: { flex: 1, minWidth: 0 },
  match: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  teams: { gap: tokens.spacing.sm },
  team: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  teamLink: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  score: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.optical,
    alignItems: "center",
    justifyContent: "center",
  },
});
