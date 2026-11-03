import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { EntryGroupSeparator } from "../../../shared/components/entry-group";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** The selected standings presentation retains its actual rank, crest, identity, J/G/P and points slots. */
export function StandingsLoading({
  layout = "list",
}: {
  layout?: "list" | "cards";
}) {
  return (
    <LoadingGroup label="Chargement du classement">
      <StandingsSkeleton layout={layout} />
    </LoadingGroup>
  );
}

/** Decorative standings remain one content block when a whole page owns the single pending announcement. */
export function StandingsSkeleton({
  layout = "list",
}: {
  layout?: "list" | "cards";
}) {
  return (
    <View style={layout === "cards" ? styles.cards : undefined}>
      {layout === "cards" ? (
        <>
          <View style={styles.podium}>
            <PodiumSkeleton
              height={tokens.sporting.standingsCard.secondMinHeight}
            />
            <PodiumSkeleton
              height={tokens.sporting.standingsCard.firstMinHeight}
            />
            <PodiumSkeleton
              height={tokens.sporting.standingsCard.thirdMinHeight}
            />
          </View>
          <StandingCardSkeleton />
          <StandingCardSkeleton />
        </>
      ) : (
        Array.from({ length: 6 }, (_, index) => (
          <Fragment key={index}>
            {index > 0 && <EntryGroupSeparator />}
            <StandingRowSkeleton />
          </Fragment>
        ))
      )}
    </View>
  );
}

/** Decorative list columns use the same native dimensions as the accepted row, without fictional ranks or values. */
function StandingRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton
        width={tokens.sporting.standingsRankWidth}
        height={tokens.sporting.standingsRankHeight}
      />
      <Skeleton
        width={tokens.size.media.match}
        height={tokens.size.media.match}
      />
      <View style={styles.copy}>
        <Skeleton height={14} />
        <Skeleton width="67%" height={9} />
      </View>
      <Skeleton width={tokens.sporting.standingsPointsWidth} height={32} />
    </View>
  );
}

/** A neutral podium occupies the published 2–1–3 silhouette without displaying medal ranks as accepted data. */
function PodiumSkeleton({ height }: { height: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.podiumCard,
        {
          minHeight: height,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.podiumIdentity}>
        <Skeleton width={24} height={28} />
        <Skeleton width={40} height={40} />
      </View>
      <Skeleton width="80%" height={28} />
      <Skeleton width={28} height={32} />
      <StatisticsSkeleton />
    </View>
  );
}

/** Subsequent cards retain the ordinary identity/points row above its three counters. */
function StandingCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <StandingRowSkeleton />
      <StatisticsSkeleton />
    </View>
  );
}

/** Three decorative counters represent only the displayed J/G/P presentation. */
function StatisticsSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.statistics, { borderColor: colors.border }]}>
      <Skeleton width={20} height={22} />
      <Skeleton width={20} height={22} />
      <Skeleton width={20} height={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: tokens.spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.sporting.standingsRowMinHeight,
    paddingVertical: tokens.spacing.compact,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.sm },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.spacing.sm,
  },
  podiumCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  podiumIdentity: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: tokens.spacing.xs,
  },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.md,
    minHeight: tokens.sporting.standingsCard.rowMinHeight,
  },
  statistics: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
});
