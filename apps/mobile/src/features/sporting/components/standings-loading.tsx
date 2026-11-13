import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** The selected standings presentation retains its rank, crest, identity, statistics and points slots. */
export function StandingsLoading({
  layout = "list",
}: Readonly<{
  layout?: "list" | "cards";
}>) {
  return (
    <LoadingGroup label="Chargement du classement">
      <StandingsSkeleton layout={layout} />
    </LoadingGroup>
  );
}

/** Six list rows or a bounded podium and two cards reserve only the selected initial presentation. */
export function StandingsSkeleton({
  layout = "list",
}: Readonly<{
  layout?: "list" | "cards";
}>) {
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
          <StandingRowSkeleton key={index} last={index === 5} />
        ))
      )}
    </View>
  );
}

/** List rows use the loaded row's padding, minimum height and inside separators. */
function StandingRowSkeleton({ last }: Readonly<{ last: boolean }>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : tokens.border.thin,
        },
      ]}
    >
      <StandingIdentitySkeleton />
    </View>
  );
}

/** The common identity row keeps a card's two name lines separate from the compact list name. */
function StandingIdentitySkeleton({
  card = false,
}: Readonly<{ card?: boolean }>) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.identityRow}>
      <Skeleton
        width={tokens.sporting.standingsRankWidth}
        height={Math.max(
          tokens.sporting.standingsRankHeight,
          tokens.typography.headingSm.lineHeight * fontScale +
            tokens.spacing.xs * 2,
        )}
      />
      <Skeleton
        width={tokens.size.media.match}
        height={tokens.size.media.match}
        radius={tokens.media.radius.list}
      />
      <View style={[styles.copy, card && styles.cardCopy]}>
        <TextSkeleton width="90%" />
        {card ? (
          <TextSkeleton width="70%" />
        ) : (
          <TextSkeleton role="metadata" width="67%" />
        )}
      </View>
      <PointsSkeleton />
    </View>
  );
}

/** A neutral card retains the loaded 2–1–3 silhouette without fictional positions or results. */
function PodiumSkeleton({ height }: Readonly<{ height: number }>) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={[
        styles.card,
        styles.podiumCard,
        {
          minHeight: height,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.podiumIdentity}>
        <Skeleton
          width={tokens.sporting.standingsCard.podiumRankWidth}
          height={Math.max(
            tokens.sporting.standingsCard.podiumRankHeight,
            tokens.typography.headingLg.lineHeight * fontScale,
          )}
        />
        <Skeleton
          width={tokens.size.media.row}
          height={tokens.size.media.row}
          radius={tokens.media.radius.tile}
        />
      </View>
      <View style={styles.podiumName}>
        <TextSkeleton width="80%" />
        <TextSkeleton width="70%" />
      </View>
      <PointsSkeleton podium />
      <PerformanceSkeleton podium />
    </View>
  );
}

/** Subsequent cards share their actual identity row and performance strip above three counters. */
function StandingCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        styles.rowCard,
        {
          minHeight: tokens.sporting.standingsCard.rowMinHeight,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <StandingIdentitySkeleton card />
      <PerformanceSkeleton />
    </View>
  );
}

/** Point ink and its unit occupy the same typography boxes as the loaded points rail. */
function PointsSkeleton({ podium = false }: Readonly<{ podium?: boolean }>) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={[styles.points, podium && styles.podiumPoints]}>
      <TextSkeleton
        role={podium ? "date" : "headingLarge"}
        width={(podium ? 30 : 23) * fontScale}
      />
      <TextSkeleton role="metadata" width={(podium ? 34 : 17) * fontScale} />
    </View>
  );
}

/** A thin performance slot and J/G/P value-label pairs preserve the real card footer anatomy. */
function PerformanceSkeleton({
  podium = false,
}: Readonly<{ podium?: boolean }>) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.performance}>
      <Skeleton height={tokens.sporting.standingsCard.performanceHeight} />
      <View style={podium ? styles.podiumStatistics : styles.rowStatistics}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={podium ? styles.podiumStatistic : styles.rowStatistic}
          >
            <TextSkeleton width={8 * fontScale} />
            <TextSkeleton role="metadata" width={8 * fontScale} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: tokens.layout.list.gap },
  row: {
    minHeight: tokens.sporting.standingsRowMinHeight,
    paddingVertical: tokens.spacing.compact,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  cardCopy: { gap: 0 },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.spacing.sm,
  },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  podiumCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  podiumIdentity: {
    width: "100%",
    minHeight: tokens.sporting.standingsCard.podiumIdentityMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  podiumName: {
    width: "100%",
    minHeight: tokens.sporting.standingsCard.nameMinHeight,
    alignItems: "center",
  },
  rowCard: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  points: {
    minWidth: tokens.sporting.standingsPointsWidth,
    alignItems: "flex-end",
  },
  podiumPoints: { alignItems: "center" },
  performance: { gap: tokens.spacing.sm, width: "100%" },
  podiumStatistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: tokens.spacing.xs,
  },
  rowStatistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: tokens.spacing.sm,
  },
  podiumStatistic: { alignItems: "center", minWidth: "25%" },
  rowStatistic: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
});
