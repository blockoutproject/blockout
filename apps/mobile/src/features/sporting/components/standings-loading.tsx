import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { standingsLayout, type StandingLayout } from "./standing-table";

const podium = tokens.sporting.standingsCard;
const podiumOrder = ["second", "first", "third"] as const;

/** The table owns one announcement, independent of its decorative layout. */
export function StandingsLoading({
  layout = "list",
}: Readonly<{ layout?: StandingLayout }>) {
  return (
    <LoadingGroup label="Chargement du classement">
      <StandingsSkeleton layout={layout} />
    </LoadingGroup>
  );
}

/** Reserves the selected table structure with a bounded neutral preview. */
export function StandingsSkeleton({
  layout = "list",
}: Readonly<{ layout?: StandingLayout }>) {
  const { colors } = useTheme();
  if (layout === "cards") {
    return (
      <View style={standingsLayout.cards}>
        <View style={standingsLayout.podium}>
          {podiumOrder.map((place) => (
            <StandingCardSkeleton
              key={place}
              podiumHeight={podium[`${place}MinHeight`]}
            />
          ))}
        </View>
        <StandingCardSkeleton />
      </View>
    );
  }
  return (
    <View>
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={index}
          style={[
            standingsLayout.listRow,
            index < 2 && {
              borderBottomColor: colors.border,
              borderBottomWidth: tokens.border.thin,
            },
          ]}
        >
          <StandingIdentitySkeleton />
        </View>
      ))}
    </View>
  );
}

function StandingIdentitySkeleton({
  card = false,
}: Readonly<{ card?: boolean }>) {
  return (
    <View style={standingsLayout.rowIdentity}>
      <Skeleton
        width={tokens.sporting.standingsRankWidth}
        height={tokens.sporting.standingsRankHeight}
      />
      <Skeleton
        width={tokens.size.media.match}
        height={tokens.size.media.match}
        radius={tokens.media.radius.list}
      />
      <View style={styles.copy}>
        <TextSkeleton width="85%" />
        {!card && <TextSkeleton role="metadata" width="60%" />}
      </View>
      <View style={standingsLayout.points}>
        <TextSkeleton role="headingLarge" width={tokens.spacing.lg} />
      </View>
    </View>
  );
}

/** Cards retain the ready surface, identity and footer anchors without placeholder statistics. */
function StandingCardSkeleton({
  podiumHeight,
}: Readonly<{ podiumHeight?: number }>) {
  const { colors } = useTheme();
  const onPodium = podiumHeight !== undefined;
  return (
    <View
      style={[
        standingsLayout.card,
        onPodium ? standingsLayout.podiumCard : standingsLayout.rowCard,
        {
          minHeight: podiumHeight ?? podium.rowMinHeight,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      {onPodium ? (
        <>
          <View
            style={[
              standingsLayout.rowIdentity,
              standingsLayout.podiumIdentity,
            ]}
          >
            <Skeleton
              width={podium.podiumRankWidth}
              height={podium.podiumRankHeight}
            />
            <Skeleton
              width={tokens.size.media.row}
              height={tokens.size.media.row}
              radius={tokens.media.radius.tile}
            />
          </View>
          <View style={styles.podiumName}>
            <TextSkeleton width="80%" />
          </View>
          <View style={[standingsLayout.points, standingsLayout.podiumPoints]}>
            <TextSkeleton role="date" width={tokens.spacing.lg} />
          </View>
        </>
      ) : (
        <StandingIdentitySkeleton card />
      )}
      <View style={[standingsLayout.performance, onPodium && styles.centered]}>
        <Skeleton height={podium.performanceHeight} />
        <TextSkeleton role="metadata" width="60%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  podiumName: {
    width: "100%",
    minHeight: podium.nameMinHeight,
    alignItems: "center",
  },
  centered: { alignItems: "center" },
});
