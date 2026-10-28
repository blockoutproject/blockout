import { useRouter } from "expo-router";
import { useId, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { StandingRowResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { SportingLogo } from "./sporting-identity";

/** Accepted source rows and columns; presentation never supplies a missing rank, statistic or association. */
export interface StandingCardsProps {
  rows: readonly StandingRowResponse[];
  columns: readonly string[];
}

/**
 * Projects one unambiguous official podium in the approved 2–1–3 composition.
 * Other rows keep source order; incomplete or duplicate podium ranks keep every row in that order.
 */
export function StandingCards({ rows, columns }: StandingCardsProps) {
  const podium = [2, 1, 3].flatMap((position) => {
    const matching = rows.filter((row) => row.position === position);
    return matching.length === 1 ? matching : [];
  });
  const hasPodium = podium.length === 3;
  const remaining = hasPodium
    ? rows.filter((row) => !podium.includes(row))
    : rows;
  return (
    <View style={styles.cards}>
      {hasPodium && (
        <View style={styles.podium}>
          {podium.map((row) => (
            <StandingCard
              key={row.position}
              row={row}
              columns={columns}
              podium
            />
          ))}
        </View>
      )}
      {remaining.map((row, index) => (
        <StandingCard key={index} row={row} columns={columns} />
      ))}
    </View>
  );
}

/** A card consumes only its exact source row; current-team emphasis belongs exclusively to the list. */
interface StandingCardProps {
  row: StandingRowResponse;
  columns: readonly string[];
  podium?: boolean;
}

/** Source identity, square admitted artwork and exact statistics share one optional real-team link. */
function StandingCard({ row, columns, podium = false }: StandingCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const rank =
    row.position === 1
      ? { fill: colors.rank.first, content: colors.rank.firstContent }
      : row.position === 2
        ? { fill: colors.rank.second, content: colors.rank.secondContent }
        : row.position === 3
          ? { fill: colors.rank.third, content: colors.rank.thirdContent }
          : { fill: colors.rank.neutral, content: colors.text };
  const label = [
    row.sourceName,
    row.position === undefined ? "Rang non renseigné" : `Rang ${row.position}`,
    columns
      .map(
        (column) => `${column} : ${row.statistics[column] ?? "non renseigné"}`,
      )
      .join(", "),
  ].join(". ");
  const points = columns.at(-1);
  const statistics = columns.slice(0, -1);
  const minHeight = podium
    ? row.position === 1
      ? tokens.sporting.standingsCard.firstMinHeight
      : row.position === 2
        ? tokens.sporting.standingsCard.secondMinHeight
        : tokens.sporting.standingsCard.thirdMinHeight
    : tokens.sporting.standingsCard.rowMinHeight;

  /** The image owner supplies both decoded layers, keeping card placement separate from media state. */
  function renderCard(logo?: ReactNode, atmosphere?: ReactNode) {
    const content = (
      <>
        {podium && <RankTint color={rank.fill} />}
        {atmosphere && (
          <View
            pointerEvents="none"
            accessible={false}
            style={podium ? styles.podiumAtmosphere : styles.rowAtmosphere}
          >
            {atmosphere}
          </View>
        )}
        <View style={podium ? styles.podiumIdentity : styles.rowIdentity}>
          <Text
            style={[
              styles.rank,
              podium ? styles.podiumRank : styles.rowRank,
              { backgroundColor: rank.fill, color: rank.content },
            ]}
          >
            {row.position ?? "—"}
          </Text>
          {logo}
          {!podium && (
            <Text
              numberOfLines={2}
              style={[styles.rowName, { color: colors.text }]}
            >
              {row.sourceName}
            </Text>
          )}
          {!podium && points && <StandingPoints row={row} column={points} />}
        </View>
        {podium && (
          <Text
            numberOfLines={2}
            style={[styles.podiumName, { color: colors.text }]}
          >
            {row.sourceName}
          </Text>
        )}
        {podium && points && (
          <StandingPoints row={row} column={points} podium />
        )}
        <View style={styles.performance}>
          <PerformanceBar row={row} columns={columns} />
          <View style={podium ? styles.podiumStatistics : styles.rowStatistics}>
            {statistics.map((column) => (
              <View
                key={column}
                style={podium ? styles.podiumStatistic : styles.rowStatistic}
              >
                <Text
                  style={[tokens.typography.strong, { color: colors.text }]}
                >
                  {row.statistics[column] ?? "—"}
                </Text>
                <Text
                  style={[
                    tokens.typography.metadata,
                    { color: colors.secondaryText },
                  ]}
                >
                  {column}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </>
    );
    const style = [
      styles.card,
      podium ? styles.podiumCard : styles.rowCard,
      {
        minHeight,
        backgroundColor: colors.surface,
        borderColor: podium ? rank.fill : colors.border,
      },
    ];
    if (!row.team)
      return (
        <View accessible accessibilityLabel={label} style={style}>
          {content}
        </View>
      );
    const teamId = row.team.id;
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() =>
          router.push({ pathname: "/teams/[teamId]", params: { teamId } })
        }
        style={style}
      >
        {content}
      </Pressable>
    );
  }

  return row.team ? (
    <SportingLogo
      identity={row.team}
      kind="team"
      size={podium ? tokens.size.media.row : tokens.size.media.match}
      renderWithAtmosphere={renderCard}
    />
  ) : (
    renderCard()
  );
}

/** The last published column retains its exact source label and value in the approved points rail. */
function StandingPoints({
  row,
  column,
  podium = false,
}: {
  row: StandingRowResponse;
  column: string;
  podium?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.points, podium && styles.podiumPoints]}>
      <Text
        style={[
          podium ? tokens.typography.headingXl : tokens.typography.headingLg,
          { color: colors.text },
        ]}
      >
        {row.statistics[column] ?? "—"}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {column}
      </Text>
    </View>
  );
}

/** An optional decorative ratio requires exact published G/P counts; it never supplies missing numbers. */
function PerformanceBar({
  row,
  columns,
}: {
  row: StandingRowResponse;
  columns: readonly string[];
}) {
  const { colors } = useTheme();
  const won = row.statistics.G;
  const lost = row.statistics.P;
  if (
    !columns.includes("G") ||
    !columns.includes("P") ||
    won === undefined ||
    lost === undefined ||
    !/^\d+$/.test(won) ||
    !/^\d+$/.test(lost)
  )
    return null;
  const wins = Number(won);
  const losses = Number(lost);
  if (
    !Number.isSafeInteger(wins) ||
    !Number.isSafeInteger(losses) ||
    !Number.isSafeInteger(wins + losses) ||
    wins + losses === 0
  )
    return null;
  return (
    <View accessible={false} pointerEvents="none" style={styles.performanceBar}>
      {wins > 0 && (
        <View
          style={[
            styles.performanceSegment,
            { flex: wins, backgroundColor: colors.performance.won },
          ]}
        />
      )}
      {losses > 0 && (
        <View
          style={[
            styles.performanceSegment,
            { flex: losses, backgroundColor: colors.performance.lost },
          ]}
        />
      )}
    </View>
  );
}

/** The approved subtle gradient uses the semantic published-rank fill in the current appearance. */
function RankTint({ color }: { color: string }) {
  const { colors } = useTheme();
  const id = useId();
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Svg
        accessible={false}
        width="100%"
        height="100%"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient
            id={id}
            x1={0}
            y1={0}
            x2={1}
            y2={0}
            gradientTransform="matrix(0.8 0.6 -0.6 0.8 0.4 -0.2)"
          >
            <Stop
              offset={0}
              stopColor={color}
              stopOpacity={tokens.sporting.standingsCard.tintOpacity}
            />
            <Stop
              offset={0.8}
              stopColor={colors.surface}
              stopOpacity={tokens.sporting.standingsCard.tintOpacity}
            />
          </LinearGradient>
        </Defs>
        <Rect width={1} height={1} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: tokens.layout.list.gap },
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
  rowCard: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  podiumIdentity: {
    width: "100%",
    minHeight: tokens.sporting.standingsCard.podiumIdentityMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  rowIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  rank: {
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  podiumRank: {
    ...tokens.typography.headingLg,
    minWidth: tokens.sporting.standingsCard.podiumRankWidth,
    minHeight: tokens.sporting.standingsCard.podiumRankHeight,
  },
  rowRank: {
    ...tokens.typography.headingSm,
    minWidth: tokens.sporting.standingsRankWidth,
    minHeight: tokens.sporting.standingsRankHeight,
  },
  podiumName: {
    ...tokens.typography.strong,
    width: "100%",
    minHeight: tokens.sporting.standingsCard.nameMinHeight,
    textAlign: "center",
  },
  rowName: {
    ...tokens.typography.strong,
    flex: 1,
    minWidth: 0,
  },
  points: {
    minWidth: tokens.sporting.standingsPointsWidth,
    alignItems: "flex-end",
  },
  podiumPoints: { alignItems: "center" },
  performance: { gap: tokens.spacing.sm, width: "100%" },
  performanceBar: {
    flexDirection: "row",
    gap: tokens.spacing.optical,
    height: tokens.sporting.standingsCard.performanceHeight,
  },
  performanceSegment: {
    height: tokens.sporting.standingsCard.performanceHeight,
  },
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
  podiumAtmosphere: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: tokens.sporting.standingsCard.atmosphereHeight,
  },
  rowAtmosphere: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: tokens.sporting.standingsCard.rowAtmosphereWidth,
  },
});
