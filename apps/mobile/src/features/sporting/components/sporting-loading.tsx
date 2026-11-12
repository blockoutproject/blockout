import { Fragment } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { IdentityCardSkeleton } from "../../../shared/components/identity-card-loading";
import { EntryRowSkeleton } from "../../../shared/components/list-loading";
import { EntryGroup } from "../../../shared/components/entry-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { MatchSurface } from "./match-surface";
import { StandingsSkeleton } from "./standings-loading";
import { CalendarSkeleton } from "./calendar-loading";

/** One initial announcement combines the team's identity with its first applicable content. */
export function SportingTeamLoading({
  calendar = false,
}: Readonly<{ calendar?: boolean }>) {
  return (
    <LoadingGroup label="Chargement de l’équipe" style={styles.body}>
      <IdentityCardSkeleton />
      {calendar ? <CalendarSkeleton /> : <StandingsSkeleton layout="list" />}
    </LoadingGroup>
  );
}

/** A pool opens its standings tab; identity and the row block share one read announcement. */
export function SportingPoolLoading() {
  return (
    <LoadingGroup label="Chargement de la poule" style={styles.body}>
      <IdentityCardSkeleton />
      <StandingsSkeleton layout="list" />
    </LoadingGroup>
  );
}

/** A club's initial information tab retains its identity and basic information rows. */
export function SportingClubLoading() {
  return (
    <LoadingGroup label="Chargement du club" style={styles.body}>
      <IdentityCardSkeleton club />
      <EntryGroup>
        <EntryRowSkeleton />
        <EntryRowSkeleton />
        <EntryRowSkeleton />
      </EntryGroup>
    </LoadingGroup>
  );
}

/** One announcement surrounds the initial public match summary. */
export function SportingMatchLoading() {
  return (
    <LoadingGroup label="Chargement du match">
      <MatchSummarySkeleton />
    </LoadingGroup>
  );
}

/** The public consultation reserves its neutral summary bands, team cells and separators. */
function MatchSummarySkeleton() {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <MatchSurface>
      <View style={[styles.pool, { backgroundColor: colors.skeletonHeader }]}>
        <Skeleton
          width={tokens.size.media.row}
          height={tokens.size.media.row}
          radius={tokens.media.radius.tile}
        />
        <View style={styles.copy}>
          <TextSkeleton width="85%" />
        </View>
      </View>
      <View style={styles.metadata}>
        <TextSkeleton role="metadata" width={49 * fontScale} />
        <View style={styles.date}>
          <TextSkeleton role="metadata" width={134 * fontScale} />
          <TextSkeleton role="metadata" width={84 * fontScale} />
        </View>
      </View>
      {[0, 1].map((index) => (
        <Fragment key={index}>
          {index > 0 && (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
          <View style={styles.team}>
            <Skeleton
              width={tokens.size.media.row}
              height={tokens.size.media.row}
              radius={tokens.media.radius.tile}
            />
            <View style={styles.copy}>
              <TextSkeleton role="navigation" width="85%" />
            </View>
            <View style={styles.score}>
              <TextSkeleton role="heading" width={12 * fontScale} />
            </View>
          </View>
        </Fragment>
      ))}
    </MatchSurface>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  pool: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.sporting.headerMinHeight,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
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
  date: {
    alignItems: "flex-end",
    flexShrink: 1,
    minWidth: tokens.sporting.dateMinWidth,
  },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.sporting.teamMinHeight,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  copy: { flex: 1, minWidth: 0 },
  score: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.tight,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: tokens.border.thin,
    opacity: tokens.sporting.separatorOpacity,
  },
});
