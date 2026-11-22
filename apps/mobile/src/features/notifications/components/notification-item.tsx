import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { NotificationResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { SportingLink } from "@/features/sporting/link";
import {
  SportingLogo,
  currentSportingTimeZone,
  formatSportingTime,
} from "@/features/sporting/notification-presentation";
import {
  NotificationCard,
  notificationCardLayout as layout,
  notificationScoreSize,
  notificationTeamLines,
  useNotificationTeamHeight,
} from "./notification-card-layout";

/** Validated current entry and exact tap intent; pending blocks repetition without changing read state. */
export interface NotificationItemProps {
  notification: NotificationResponse;
  onPress: () => void;
  pending?: boolean;
}

export function NotificationItem({
  notification: row,
  onPress,
  pending = false,
}: Readonly<NotificationItemProps>) {
  const { colors } = useTheme();
  const teamHeight = useNotificationTeamHeight();
  const division = row.division;
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
  // Link availability and special results can carry information beyond the set totals.
  const event =
    row.family === "result" && score && !result?.specialLabel
      ? undefined
      : row.title;
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
  const matchLabel = `${[event, pool.name].filter(Boolean).join(" ")}. ${teamDescription}. ${date} — ${row.read ? "lue" : "non lue"}`;

  function renderCard(logo: ReactNode, atmosphere: ReactNode) {
    return (
      <NotificationCard divisionColor={division.color}>
        <View style={layout.header}>
          {atmosphere}
          <SportingLink
            kind="pool"
            id={pool.id}
            label={`Voir la poule ${pool.name}`}
            style={layout.pool}
          >
            {logo}
            <View style={layout.identity}>
              <Text
                numberOfLines={1}
                style={[styles.poolName, { color: colors.text }]}
              >
                {pool.name}
              </Text>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {date}
              </Text>
            </View>
          </SportingLink>
          {!row.read && (
            <View
              accessible={false}
              style={[styles.dot, { backgroundColor: colors.secondaryText }]}
            />
          )}
        </View>
        {!!event && (
          <Text
            style={[
              layout.inset,
              tokens.typography.label,
              { color: colors.text },
            ]}
          >
            {event}
          </Text>
        )}
        <View style={[layout.inset, layout.participants]}>
          <View style={layout.teams}>
            {teams.map(({ identity, side }) => {
              const name = identity.name.trim();
              const team = (
                <>
                  <SportingLogo
                    kind="team"
                    identity={identity}
                    size={tokens.size.icon.lg}
                  />
                  <Text
                    numberOfLines={notificationTeamLines}
                    style={[
                      tokens.typography.label,
                      layout.teamCopy,
                      { color: colors.text },
                    ]}
                  >
                    {name || "Nom indisponible"}
                  </Text>
                </>
              );
              const teamStyle = [layout.team, { minHeight: teamHeight }];
              return name ? (
                <SportingLink
                  key={side}
                  kind="team"
                  id={identity.id}
                  label={`Voir l’équipe ${name}`}
                  style={teamStyle}
                >
                  {team}
                </SportingLink>
              ) : (
                <View key={side} style={teamStyle}>
                  {team}
                </View>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={matchLabel}
            accessibilityHint="Ouvrir la fiche du match"
            accessibilityState={{ disabled: pending, busy: pending }}
            disabled={pending}
            onPress={onPress}
            style={({ pressed }) => [
              layout.match,
              pressed && { opacity: tokens.opacity.pressed },
            ]}
          >
            {score && (
              <View style={layout.scores}>
                {teams.map(({ value, side }) => (
                  <View key={side} style={layout.scoreSlot}>
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
                  </View>
                ))}
              </View>
            )}
            <ChevronRight
              accessible={false}
              size={tokens.size.icon.sm}
              color={colors.icon}
            />
          </Pressable>
        </View>
      </NotificationCard>
    );
  }

  return (
    <SportingLogo
      kind="division"
      identity={division}
      size={tokens.size.control.compact}
      renderWithAtmosphere={renderCard}
    />
  );
}

const styles = StyleSheet.create({
  poolName: {
    ...tokens.typography.label,
    fontFamily: tokens.typography.navigation.fontFamily,
  },
  dot: {
    width: tokens.spacing.sm,
    height: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  score: {
    minWidth: notificationScoreSize.width,
    minHeight: notificationScoreSize.height,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: tokens.spacing.optical,
    alignItems: "center",
    justifyContent: "center",
  },
});
