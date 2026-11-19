import { divisionTextColor } from "../presentation";
import { useSportingNavigation } from "../navigation";
import { Fragment, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { formatSportingSchedule } from "../model/sporting-time";
import { MatchSurface } from "./match-surface";
import { SportingArtwork, SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";
import { DivisionPaint } from "./division-paint";
import { matchStatusLabel } from "../model/match-presentation";

/** Accepted identity/result facts; display zone changes text without changing calendar groups. */
export interface MatchSummaryProps {
  match: MatchSummaryResponse;
  displayTimeZone?: string;
  /** Contribution context keeps identities/time and known scores informational; summary retains sporting navigation. */
  presentation?: "summary" | "context";
}

/** Shares accepted pool/team facts and their nominal media slots between consultation and informational contribution context. */
export function MatchSummary({
  match,
  displayTimeZone,
  presentation = "summary",
}: Readonly<MatchSummaryProps>) {
  /** Explains the accepted incomplete result without inventing a final score. */
  function unavailableResultLabel() {
    if (!contextual) {
      return "Résultat définitif indisponible";
    }
    if (result?.state === "provisional") {
      return "Résultat provisoire · Résultat définitif indisponible";
    }
    return "Résultat non confirmé · Résultat définitif indisponible";
  }

  const { colors, context } = useTheme();
  const division = match.pool.classification.division;
  const accent = division?.color ?? context.primary;
  const onAccent = division ? divisionTextColor(accent) : context.onAction;
  const result = match.result;
  const contextual = presentation === "context";
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
  return (
    <MatchSurface division={division} raised={!contextual}>
      <View
        style={[
          styles.pool,
          contextual && styles.contextPool,
          { backgroundColor: contextual ? accent : colors.surface },
        ]}
      >
        {contextual && division && <DivisionPaint division={division} />}
        {contextual && division && <SportingArtwork division={division} />}
        {division ? (
          <SportingLogo
            kind="division"
            identity={division}
            renderWithAtmosphere={
              contextual
                ? undefined
                : (logo, atmosphere) => (
                    <>
                      {atmosphere}
                      {logo}
                    </>
                  )
            }
          />
        ) : (
          <SportingMedia kind="division" identity={match.pool.pool} />
        )}
        <Text
          accessibilityRole="header"
          accessibilityLabel={match.pool.pool.name}
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            styles.copy,
            tokens.typography.strong,
            { color: contextual ? onAccent : colors.text },
          ]}
        >
          {match.pool.pool.name}
        </Text>
        {contextual && (
          <Text style={[styles.metadataText, { color: onAccent }]}>
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
            {/* Keep the status in its measured line when Android redraws text after a theme change. */}
            <Text
              numberOfLines={1}
              style={[styles.metadataText, { color: colors.text }]}
            >
              {matchStatusLabel(match)}
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
              <Text
                style={[
                  styles.copy,
                  tokens.typography.navigation,
                  { color: colors.text },
                ]}
              >
                {team.name}
              </Text>
              {(!contextual || score !== undefined) && (
                <View
                  style={[
                    styles.scoreCell,
                    contextual
                      ? [styles.contextScore, { borderColor: accent }]
                      : { backgroundColor: accent },
                  ]}
                >
                  <Text
                    accessibilityLabel={`Score ${side} : ${score ?? "indisponible"}`}
                    style={[
                      styles.score,
                      { color: contextual ? colors.text : onAccent },
                    ]}
                  >
                    {score ?? "-"}
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
                <TeamScoreLink
                  key={team.id}
                  teamId={team.id}
                  label={`${team.name} · Score ${side} : ${score ?? "indisponible"}`}
                >
                  {content}
                </TeamScoreLink>
              )}
            </View>
          );
        })}
      </View>
      {result && result.state !== "final" && (
        <Text style={[styles.note, { color: colors.secondaryText }]}>
          {unavailableResultLabel()}
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

/** Reserves the public summary bands and both team rows with one loading announcement. */
export function MatchSummaryLoading() {
  const { colors } = useTheme();
  const media = (
    <Skeleton
      width={tokens.size.media.row}
      height={tokens.size.media.row}
      radius={tokens.media.radius.tile}
    />
  );
  return (
    <LoadingGroup label="Chargement du match">
      <MatchSurface>
        <View style={styles.pool}>
          {media}
          <View style={styles.copy}>
            <TextSkeleton width="85%" />
          </View>
        </View>
        <View style={[styles.metadata, { backgroundColor: colors.subtle }]}>
          <TextSkeleton role="metadata" width="24%" />
          <View style={[styles.copy, styles.date]}>
            <TextSkeleton role="metadata" width="65%" />
          </View>
        </View>
        {(["home", "away"] as const).map((side) => (
          <Fragment key={side}>
            {side === "away" && (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            )}
            <View style={styles.team}>
              {media}
              <View style={styles.copy}>
                <TextSkeleton role="navigation" width="80%" />
              </View>
              <View style={styles.scoreCell}>
                <TextSkeleton role="heading" width={tokens.spacing.md} />
              </View>
            </View>
          </Fragment>
        ))}
      </MatchSurface>
    </LoadingGroup>
  );
}

/** Only the full consultation's actual team action consumes sporting navigation; informational context stays independent. */
function TeamScoreLink({
  teamId,
  label,
  children,
}: Readonly<PropsWithChildren<{ teamId: string; label: string }>>) {
  const sporting = useSportingNavigation();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void sporting.navigate("team", teamId)}
      style={({ pressed }) => [
        styles.team,
        { opacity: pressed ? tokens.opacity.pressed : 1 },
      ]}
    >
      {children}
    </Pressable>
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
  copy: { flex: 1, minWidth: 0 },
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
  scoreCell: {
    minWidth: tokens.sporting.scoreSize,
    minHeight: tokens.sporting.scoreSize,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
    alignItems: "center",
  },
  contextScore: { borderWidth: tokens.border.thin },
  score: { ...tokens.typography.heading, textAlign: "center" },
  separator: {
    height: tokens.border.thin,
    opacity: tokens.sporting.separatorOpacity,
  },
  note: { ...tokens.typography.metadata, padding: tokens.spacing.md },
});
