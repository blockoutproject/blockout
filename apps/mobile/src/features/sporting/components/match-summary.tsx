import { divisionTextColor } from "../presentation";
import { useSportingNavigation } from "../navigation";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { formatSportingSchedule } from "../model/sporting-time";
import { MatchSurface } from "./match-surface";
import { SportingArtwork, SportingLogo } from "./sporting-identity";
import { DivisionPaint } from "./division-paint";

/** Accepted identity/result facts; display zone changes text without changing calendar groups. */
export interface MatchSummaryProps {
  match: MatchSummaryResponse;
  displayTimeZone?: string;
  /** Contribution context keeps identities/time and known scores informational; summary retains sporting navigation. */
  presentation?: "summary" | "context";
}

/** Maps accepted result precision to approved summary statuses without inventing a live state. */
function statusLabel(match: MatchSummaryResponse): string {
  if (match.result?.state === "final") return "Terminé";
  if (match.result?.state === "provisional") return "Score provisoire";
  if (match.result?.state === "unconfirmed") return "Résultat non confirmé";
  return match.category === "completed" ? "Résultat indisponible" : "À venir";
}

/** Figma Match Summary shares its pool/teams between full consultation and compact informational contribution context. */
export function MatchSummary({
  match,
  displayTimeZone,
  presentation = "summary",
}: MatchSummaryProps) {
  const sporting = useSportingNavigation();
  const { colors, context } = useTheme();
  const division = match.pool.classification.division;
  const accent = division?.color ?? context.primary;
  const result = match.result;
  const contextual = presentation === "context";
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
  return (
    <MatchSurface division={division}>
      <View
        style={[
          styles.pool,
          contextual && styles.contextPool,
          { backgroundColor: accent },
        ]}
      >
        {division && <DivisionPaint division={division} />}
        {division && <SportingArtwork division={division} />}
        {division && <SportingLogo kind="division" identity={division} />}
        <Text
          accessibilityRole="header"
          style={[
            styles.poolName,
            {
              color: division
                ? divisionTextColor(division.color)
                : context.onAction,
            },
          ]}
        >
          {match.pool.pool.name}
        </Text>
        {contextual && (
          <Text
            style={[
              styles.metadataText,
              {
                color: division
                  ? divisionTextColor(division.color)
                  : context.onAction,
              },
            ]}
          >
            {schedule.time}
          </Text>
        )}
      </View>
      {!contextual && (
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
            <Text
              style={[styles.metadataText, { color: colors.secondaryText }]}
            >
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
      )}
      <View style={contextual ? styles.contextBody : undefined}>
        {[
          { team: match.home, score: result?.homeSets, side: "domicile" },
          { team: match.away, score: result?.awaySets, side: "extérieur" },
        ].map(({ team, score, side }, index) => {
          const content = (
            <>
              <SportingLogo kind="team" identity={team} />
              <Text style={[styles.teamName, { color: colors.text }]}>
                {team.name}
              </Text>
              {(!contextual || score !== undefined) && (
                <View style={[styles.scoreCell, { borderColor: accent }]}>
                  <Text
                    accessibilityLabel={`Score ${side} : ${score ?? "indisponible"}`}
                    style={[styles.score, { color: colors.text }]}
                  >
                    {score ?? "—"}
                  </Text>
                </View>
              )}
            </>
          );
          return (
            <View key={side}>
              {index > 0 && (
                <View
                  style={[styles.separator, { backgroundColor: colors.border }]}
                />
              )}
              {contextual ? (
                <View style={[styles.team, styles.contextTeam]}>{content}</View>
              ) : (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${team.name} · Score ${side} : ${score ?? "indisponible"}`}
                  onPress={() => void sporting.navigate("team", team.id)}
                  style={({ pressed }) => [
                    styles.team,
                    { opacity: pressed ? tokens.opacity.pressed : 1 },
                  ]}
                >
                  {content}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
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
  contextPool: { minHeight: 0 },
  contextBody: { paddingVertical: tokens.spacing.md, gap: tokens.spacing.sm },
  contextTeam: {
    minHeight: 0,
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  poolName: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
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
    gap: tokens.spacing.tight,
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
    // The approved score cell is a 40-point minimum, independent of logo/media dimensions.
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
    justifyContent: "center",
    alignItems: "center",
  },
  score: { ...tokens.typography.heading, textAlign: "center" },
  separator: {
    height: tokens.border.thin,
    opacity: tokens.sporting.separatorOpacity,
  },
  note: { ...tokens.typography.metadata, padding: tokens.spacing.md },
});
