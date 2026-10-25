import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { formatSportingSchedule } from "../model/sporting-time";
import { MatchSurface } from "./match-surface";
import {
  DivisionPaint,
  SportingArtwork,
  SportingLogo,
} from "./sporting-identity";

/** Accepted identity/result facts; display zone changes text without changing calendar groups. */
export interface MatchSummaryProps {
  match: MatchSummaryResponse;
  displayTimeZone?: string;
}

/** Maps accepted result precision to approved summary statuses without inventing a live state. */
function statusLabel(match: MatchSummaryResponse): string {
  if (match.result?.state === "final") return "Terminé";
  if (match.result?.state === "provisional") return "Score provisoire";
  if (match.result?.state === "unconfirmed") return "Résultat non confirmé";
  return match.category === "completed" ? "Résultat indisponible" : "À venir";
}

/** Figma Match Summary: informational pool heading, metadata strip and exact team destinations. */
export function MatchSummary({ match, displayTimeZone }: MatchSummaryProps) {
  const router = useRouter();
  const { colors, context } = useTheme();
  const division = match.pool.classification.division;
  const accent = division?.color ?? context.primary;
  const result = match.result;
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
  return (
    <MatchSurface division={division}>
      <View style={[styles.pool, { backgroundColor: accent }]}>
        {division?.gradient && <DivisionPaint division={division} />}
        {division?.logoUrl && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.artwork}
          >
            <View style={styles.cover}>
              <SportingArtwork identity={division} kind="division" />
            </View>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: accent,
                  opacity: tokens.sporting.coverVeilOpacity,
                },
              ]}
            />
          </View>
        )}
        {division && <SportingLogo kind="division" identity={division} />}
        <Text
          accessibilityRole="header"
          style={[
            styles.poolName,
            { color: division ? colors.onSporting : context.onAction },
          ]}
        >
          {match.pool.pool.name}
        </Text>
      </View>
      <View style={[styles.metadata, { backgroundColor: colors.subtle }]}>
        <View style={styles.status}>
          <View
            accessible={false}
            style={[styles.dot, { backgroundColor: accent }]}
          />
          <Text style={[styles.metadataText, { color: colors.text }]}>
            {statusLabel(match)}
          </Text>
        </View>
        <View style={styles.date}>
          <Text style={[styles.metadataText, { color: colors.secondaryText }]}>
            {schedule.date}
            {match.schedule.instant ? ` à ${schedule.time}` : ""}
          </Text>
          {!match.schedule.instant && (
            <Text
              style={[styles.metadataText, { color: colors.secondaryText }]}
            >
              {schedule.time}
            </Text>
          )}
        </View>
      </View>
      {[
        { team: match.home, score: result?.homeSets, side: "domicile" },
        { team: match.away, score: result?.awaySets, side: "extérieur" },
      ].map(({ team, score, side }, index) => (
        <View key={side}>
          {index > 0 && (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={team.name}
            onPress={() =>
              router.push({
                pathname: "/teams/[teamId]",
                params: { teamId: team.id },
              })
            }
            style={styles.team}
          >
            <SportingLogo kind="team" identity={team} />
            <Text style={[styles.teamName, { color: colors.text }]}>
              {team.name}
            </Text>
            <View style={[styles.scoreCell, { borderColor: accent }]}>
              <Text
                accessibilityLabel={`Score ${side} : ${score ?? "indisponible"}`}
                style={[styles.score, { color: colors.text }]}
              >
                {score ?? "—"}
              </Text>
            </View>
          </Pressable>
        </View>
      ))}
      {result && result.state !== "final" && (
        <Text style={[styles.note, { color: colors.secondaryText }]}>
          {result.state === "provisional"
            ? "Résultat provisoire · Résultat définitif indisponible"
            : "Résultat non confirmé · Résultat définitif indisponible"}
        </Text>
      )}
      {result?.specialLabel && (
        <Text style={[styles.note, { color: colors.secondaryText }]}>
          {result.specialLabel}
        </Text>
      )}
    </MatchSurface>
  );
}

const styles = StyleSheet.create({
  pool: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.sporting.headerMinHeight,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    overflow: "hidden",
    borderTopLeftRadius: tokens.radius.panelInset,
    borderTopRightRadius: tokens.radius.panelInset,
  },
  poolName: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
  artwork: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cover: {
    width: tokens.sporting.coverSize,
    aspectRatio: 1,
    opacity: tokens.sporting.coverOpacity,
    transform: [
      { translateX: tokens.sporting.coverOffsetX },
      { translateY: tokens.sporting.coverOffsetY },
    ],
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacing.sm,
    rowGap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.label,
  },
  dot: {
    width: tokens.sporting.statusDot,
    height: tokens.sporting.statusDot,
    borderRadius: tokens.radius.full,
  },
  metadataText: { ...tokens.typography.metadata },
  date: {
    alignItems: "flex-end",
    minWidth: tokens.sporting.dateMinWidth,
    flexShrink: 1,
  },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.sporting.teamMinHeight,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  teamName: { ...tokens.typography.navigation, flex: 1, minWidth: 0 },
  scoreCell: {
    minWidth: tokens.size.mediaRow,
    minHeight: tokens.size.mediaRow,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.label,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.borderWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  score: { ...tokens.typography.heading, textAlign: "center" },
  separator: {
    height: tokens.borderWidth,
    opacity: tokens.sporting.separatorOpacity,
  },
  note: { ...tokens.typography.metadata, padding: tokens.spacing.md },
});
