import { useId, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { StandingRowResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import {
  standingColumnLabel,
  standingPointsColumn,
} from "../model/standing-columns";
import { useSportingNavigation } from "../navigation";
import { SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";
import { StandingPerformanceBar } from "./standing-performance-bar";

export type StandingLayout = "list" | "cards";

interface StandingTableProps {
  rows: readonly StandingRowResponse[];
  columns: readonly string[];
  layout: StandingLayout;
  active: boolean;
  highlightTeamId?: string;
  divisionColor?: string;
}

const medals = ["first", "second", "third"] as const;
const card = tokens.sporting.standingsCard;

/** Both layouts keep each keyed row under the same parent so changing the presentation keeps its native logo. */
export function StandingTable({
  rows,
  columns,
  layout,
  active,
  highlightTeamId,
  divisionColor,
}: Readonly<StandingTableProps>) {
  const rankedRows = rows.map((row, index) => ({
    row,
    displayRank: index + 1,
  }));
  const hasPodium = rows.length >= 3;
  const cards = layout === "cards";
  const tableStyle = cards && standingsLayout.cards;
  const podium = cards && hasPodium;
  const top = podium
    ? [rankedRows[1], rankedRows[0], rankedRows[2]]
    : rankedRows.slice(0, 3);

  function renderRows(
    group: typeof rankedRows,
    variant: StandingRowProps["variant"],
    nativeLogoSize?: number,
  ) {
    return group.map(({ row, displayRank }) => (
      <StandingRow
        key={`${displayRank}:${row.team?.id ?? "unlinked"}`}
        row={row}
        displayRank={displayRank}
        columns={columns}
        variant={variant}
        nativeLogoSize={nativeLogoSize}
        active={active}
        highlighted={row.team !== undefined && row.team.id === highlightTeamId}
        divisionColor={divisionColor}
        last={displayRank === rows.length}
      />
    ));
  }

  return (
    <View style={tableStyle}>
      <View style={podium ? standingsLayout.podium : tableStyle}>
        {renderRows(
          top,
          podium ? "podium" : layout,
          hasPodium ? tokens.size.media.row : undefined,
        )}
      </View>
      {renderRows(rankedRows.slice(3), layout)}
    </View>
  );
}

interface StandingRowProps {
  row: StandingRowResponse;
  displayRank: number;
  columns: readonly string[];
  variant: StandingLayout | "podium";
  nativeLogoSize?: number;
  active: boolean;
  highlighted: boolean;
  divisionColor?: string;
  last: boolean;
}

/** Only an explicitly associated team opens a route. Presentation leaves the published rank and statistics intact. */
function StandingRow({
  row,
  displayRank,
  columns,
  variant,
  nativeLogoSize,
  active,
  highlighted,
  divisionColor,
  last,
}: Readonly<StandingRowProps>) {
  const sporting = useSportingNavigation(active);
  const { colors } = useTheme();
  const list = variant === "list";
  const podium = variant === "podium";
  const medal = medals[displayRank - 1];
  const rankFill = medal ? colors.rank[medal] : colors.rank.neutral;
  const rankInk = medal ? colors.rank[`${medal}Content`] : colors.text;
  const rankLabel = `Rang ${displayRank}`;
  const label = [
    row.sourceName,
    rankLabel,
    columns
      .map(
        (column) => `${column} : ${row.statistics[column] ?? "non renseigné"}`,
      )
      .join(", "),
  ]
    .filter(Boolean)
    .join(". ");
  const points = standingPointsColumn(columns);
  const statistics = columns.filter((column) => column !== points);
  const statisticItems = (
    <View
      style={
        list
          ? styles.listStatistics
          : podium
            ? styles.podiumStatistics
            : styles.cardStatistics
      }
    >
      {statistics.map((column) => (
        <View
          key={column}
          style={
            list
              ? styles.listStatistic
              : podium
                ? styles.podiumStatistic
                : styles.cardStatistic
          }
        >
          <Text
            style={[
              list ? tokens.typography.metadata : tokens.typography.strong,
              { color: colors.text },
            ]}
          >
            {row.statistics[column] ?? "—"}
          </Text>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {standingColumnLabel(column)}
          </Text>
        </View>
      ))}
    </View>
  );
  const pointsRail = points && (
    <View
      style={[standingsLayout.points, podium && standingsLayout.podiumPoints]}
    >
      <Text
        style={[
          podium ? tokens.typography.headingXl : tokens.typography.headingLg,
          { color: colors.text },
        ]}
      >
        {row.statistics[points] ?? "—"}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {standingColumnLabel(points)}
      </Text>
    </View>
  );
  const nameStyle = [tokens.typography.strong, { color: colors.text }];
  const style = list
    ? [
        standingsLayout.listRow,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : tokens.border.thin,
        },
      ]
    : [
        standingsLayout.card,
        podium ? standingsLayout.podiumCard : standingsLayout.rowCard,
        {
          minHeight:
            podium && medal ? card[`${medal}MinHeight`] : card.rowMinHeight,
          backgroundColor: colors.surface,
          borderColor: podium ? rankFill : colors.border,
        },
      ];

  function renderRow(logo: ReactNode, atmosphere?: ReactNode) {
    const content = (
      <>
        {podium && <RankTint color={rankFill} />}
        {podium && atmosphere ? (
          <View
            pointerEvents="none"
            accessible={false}
            style={styles.podiumAtmosphere}
          >
            {atmosphere}
          </View>
        ) : (
          atmosphere
        )}
        {list && highlighted && (
          <View
            pointerEvents="none"
            style={[
              styles.marker,
              { backgroundColor: divisionColor ?? colors.text },
            ]}
          />
        )}
        <View
          style={[
            standingsLayout.rowIdentity,
            podium && standingsLayout.podiumIdentity,
          ]}
        >
          <View
            style={[
              styles.rank,
              podium ? styles.podiumRank : styles.rowRank,
              list && styles.listRankWidth,
              { backgroundColor: rankFill },
            ]}
          >
            <Text
              accessibilityLabel={list ? rankLabel : undefined}
              style={[
                podium
                  ? tokens.typography.headingLg
                  : tokens.typography.headingSm,
                list && styles.listRank,
                { color: rankInk },
              ]}
            >
              {displayRank}
            </Text>
          </View>
          <View
            style={[
              styles.identity,
              podium ? styles.podiumLogo : styles.rowLogo,
            ]}
          >
            {logo}
            {!podium && (
              <View style={[styles.copy, list && styles.listCopy]}>
                <Text numberOfLines={list ? 1 : 2} style={nameStyle}>
                  {row.sourceName}
                </Text>
                {list && statisticItems}
              </View>
            )}
          </View>
          {!podium && pointsRail}
        </View>
        {podium && (
          <Text numberOfLines={2} style={[nameStyle, styles.podiumName]}>
            {row.sourceName}
          </Text>
        )}
        {podium && pointsRail}
        {!list && (
          <View style={standingsLayout.performance}>
            <StandingPerformanceBar row={row} columns={columns} />
            {statisticItems}
          </View>
        )}
      </>
    );
    if (!row.team) {
      return (
        <View
          accessible={!list}
          accessibilityLabel={list ? undefined : label}
          style={style}
        >
          {content}
        </View>
      );
    }
    const teamId = row.team.id;
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={list ? { selected: highlighted } : undefined}
        onPress={() => void sporting.navigate("team", teamId)}
        style={style}
      >
        {content}
      </Pressable>
    );
  }

  const size = podium ? tokens.size.media.row : tokens.size.media.match;
  return row.team ? (
    <SportingLogo
      identity={row.team}
      kind="team"
      size={size}
      nativeSize={nativeLogoSize}
      atmosphere={
        !list && {
          layout: podium ? "podium" : "horizontal",
          withdrawLogoOnError: true,
        }
      }
      renderWithAtmosphere={renderRow}
    />
  ) : (
    <SportingMedia
      identity={{ name: row.sourceName }}
      kind="team"
      size={size}
      atmosphere={false}
      renderWithAtmosphere={renderRow}
    />
  );
}

function RankTint({ color }: Readonly<{ color: string }>) {
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

/** Structural styles shared by the ready table and its neutral first-read placeholder. */
export const standingsLayout = StyleSheet.create({
  cards: { gap: tokens.layout.list.gap },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.spacing.sm,
  },
  listRow: {
    justifyContent: "center",
    paddingVertical: tokens.spacing.compact,
    minHeight: tokens.sporting.standingsRowMinHeight,
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
  rowIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  podiumIdentity: {
    width: "100%",
    minHeight: card.podiumIdentityMinHeight,
    justifyContent: "space-between",
  },
  points: {
    minWidth: tokens.sporting.standingsPointsWidth,
    alignItems: "flex-end",
  },
  podiumPoints: { alignItems: "center" },
  performance: { gap: tokens.spacing.sm, width: "100%" },
});

const styles = StyleSheet.create({
  marker: {
    position: "absolute",
    left: -tokens.spacing.sm,
    alignSelf: "flex-start",
    height: tokens.sporting.standingsMarkerHeight,
    width: tokens.sporting.standingsMarkerWidth,
    borderRadius: tokens.sporting.standingsMarkerWidth / 2,
  },
  identity: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  rowLogo: { flex: 1 },
  podiumLogo: { flexShrink: 1 },
  rank: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
  },
  podiumRank: {
    minWidth: card.podiumRankWidth,
    minHeight: card.podiumRankHeight,
  },
  rowRank: {
    minWidth: tokens.sporting.standingsRankWidth,
    minHeight: tokens.sporting.standingsRankHeight,
  },
  listRankWidth: { width: tokens.sporting.standingsRankWidth },
  listRank: { paddingVertical: tokens.spacing.xs },
  podiumName: {
    width: "100%",
    minHeight: card.nameMinHeight,
    textAlign: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  listCopy: { gap: tokens.spacing.xs },
  listStatistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.compact,
  },
  listStatistic: { flexDirection: "row", gap: tokens.spacing.xs },
  podiumStatistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: tokens.spacing.xs,
  },
  cardStatistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: tokens.spacing.sm,
  },
  podiumStatistic: { alignItems: "center", minWidth: "25%" },
  cardStatistic: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacing.xs,
  },
  podiumAtmosphere: {
    position: "absolute",
    top:
      tokens.spacing.sm +
      (card.podiumIdentityMinHeight - card.atmosphereHeight) / 2,
    end: tokens.spacing.sm + (tokens.size.media.row - card.atmosphereWidth) / 2,
    width: card.atmosphereWidth,
    height: card.atmosphereHeight,
    opacity: card.atmosphereOpacity,
  },
});
