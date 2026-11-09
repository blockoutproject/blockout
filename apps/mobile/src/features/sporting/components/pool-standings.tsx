import { PageScrollView, PageContent } from "../../../shared/components/page";
import {
  standingColumnLabel,
  standingPointsColumn,
  standingVisibleColumns,
} from "../model/standing-columns";
import { useQuery } from "@tanstack/react-query";
import { useSportingNavigation } from "../navigation";
import { Columns3, List, RefreshCw } from "lucide-react-native";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  PoolSummaryResponse,
  StandingRowResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";

import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { resourceUnavailable } from "../model/consultation-availability";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { SportingLogo } from "./sporting-identity";
import { StandingCards } from "./standing-cards";
import { StandingsLoading } from "./standings-loading";

/** One exact pool's independently retained table; team emphasis uses identity alone, never rank. */
export interface PoolStandingsProps {
  pool: PoolSummaryResponse;
  highlightTeamId?: string;
  /** Retained inactive panels cannot refresh or release an old sporting opening. */
  active?: boolean;
  /** Optional exact pool entry shares the compact row with the layout controls. */
  children?: ReactNode;
}

/** Retains the native scroller; empty tables reload on their card and populated tables keep native refresh. */
export function PoolStandings({
  pool,
  highlightTeamId,
  active = true,
  children,
}: PoolStandingsProps) {
  /** Distinguishes a missing table, failed retained read and supplier-declared empty standings. */
  function renderStandingsState() {
    if (!data) {
      return (
        <ReadFeedback
          query={standings}
          loadingContent={<StandingsLoading layout={layout} />}
        />
      );
    }
    if (standings.isError || data.availability === "unavailable") {
      return (
        <ErrorState
          onRetry={() => void refresh()}
          retrying={standings.isFetching}
        />
      );
    }
    return (
      <EmptyState
        title={
          data.availability === "not-published"
            ? "Pas de classement pour cette phase"
            : "Aucune équipe dans ce classement"
        }
      >
        <Button
          label="Actualiser"
          leadingIcon={RefreshCw}
          onPress={() => void refresh()}
          loading={standings.isFetching}
          disabled={!active}
        />
      </EmptyState>
    );
  }

  const queries = useConsultationQueries();
  const standings = useQuery(queries.standings(pool.pool.id));
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const [layout, setLayout] = useState<"list" | "cards">("list");
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const data = standings.data;
  const columns = standingVisibleColumns(data?.columns ?? []);

  /** Refetches only this table; ordinary failure preserves its original supplier attribution. */
  async function refresh() {
    if (!active) {
      return;
    }
    feedback.clear();
    const result = await standings.refetch({ cancelRefetch: false });
    if (
      result.isError &&
      currentActive.current &&
      result.data &&
      result.data.availability === "available" &&
      result.data.rows.length > 0 &&
      !resourceUnavailable(result.error)
    ) {
      feedback.error();
    }
  }

  const hasRows = data?.availability === "available" && data.rows.length > 0;

  const refreshControl = hasRows ? (
    <DataRefreshControl onRefresh={refresh} enabled={active} />
  ) : undefined;
  const headerRow = (
    <View style={styles.headerRow}>
      {children && <View style={styles.participation}>{children}</View>}
      <View
        style={styles.toolbar}
        accessibilityRole="radiogroup"
        accessibilityLabel="Présentation du classement"
      >
        {(
          [
            ["cards", "Afficher en cartes", Columns3],
            ["list", "Afficher en liste", List],
          ] as const
        ).map(([value, label, Icon]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: layout === value }}
            onPress={() => setLayout(value)}
            style={styles.layoutAction}
          >
            <View
              style={[
                styles.layoutVisual,
                {
                  backgroundColor: layout === value ? colors.subtle : undefined,
                },
              ]}
            >
              <Icon size={tokens.size.icon.md} color={colors.icon} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
  if (!hasRows) {
    return (
      <PageScrollView refreshControl={refreshControl}>
        {standings.isLoading ? (
          <PageContent style={styles.content}>
            <View style={styles.standings}>
              {headerRow}
              <StandingsLoading layout={layout} />
            </View>
          </PageContent>
        ) : (
          <>
            {children && (
              <PageContent style={styles.stateControls}>{children}</PageContent>
            )}
            <ScreenState>{renderStandingsState()}</ScreenState>
          </>
        )}
      </PageScrollView>
    );
  }
  return (
    <PageScrollView alwaysBounceVertical refreshControl={refreshControl}>
      <PageContent style={styles.content}>
        <View style={styles.standings}>
          {headerRow}
          {layout === "cards" ? (
            <StandingCards rows={data.rows} columns={columns} active={active} />
          ) : (
            <View>
              {data.rows.map((row, index) => (
                <StandingEntry
                  key={`${index}:${row.team?.id ?? "unlinked"}`}
                  row={row}
                  active={active}
                  columns={columns}
                  highlighted={
                    row.team !== undefined && row.team.id === highlightTeamId
                  }
                  color={pool.classification.division?.color}
                  last={index === data.rows.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      </PageContent>
    </PageScrollView>
  );
}

/** Official source rows have no row identity; their list order is presentation, never a rank. */
interface StandingEntryProps {
  row: StandingRowResponse;
  columns: string[];
  highlighted: boolean;
  color?: string;
  last: boolean;
  active: boolean;
}

/** Preserves source labels and optional values; only an explicitly associated team opens a route. */
function StandingEntry({
  row,
  columns,
  highlighted,
  color,
  last,
  active,
}: StandingEntryProps) {
  const { colors } = useTheme();
  const sporting = useSportingNavigation(active);
  const statistics = columns
    .map((column) => `${column} : ${row.statistics[column] ?? "non renseigné"}`)
    .join(", ");
  const label = [
    row.sourceName,
    row.position === undefined ? "Rang non renseigné" : `Rang ${row.position}`,
    statistics,
  ]
    .filter(Boolean)
    .join(". ");
  const points = standingPointsColumn(columns);
  let medal: "first" | "second" | "third" | undefined;
  if (row.position === 1) {
    medal = "first";
  } else if (row.position === 2) {
    medal = "second";
  } else if (row.position === 3) {
    medal = "third";
  } else {
    medal = undefined;
  }
  const rankFill = medal ? colors.rank[medal] : colors.rank.neutral;
  const rankInk = medal ? colors.rank[`${medal}Content`] : colors.text;
  const content = (
    <>
      {highlighted && (
        <View
          pointerEvents="none"
          style={[styles.marker, { backgroundColor: color ?? colors.text }]}
        />
      )}
      <Text
        accessibilityLabel={
          row.position === undefined
            ? "Rang non renseigné"
            : `Rang ${row.position}`
        }
        style={[
          styles.position,
          tokens.typography.headingSm,
          { color: rankInk, backgroundColor: rankFill },
        ]}
      >
        {row.position ?? "—"}
      </Text>
      <View style={styles.identity}>
        {row.team && (
          <SportingLogo
            identity={row.team}
            kind="team"
            size={tokens.size.media.match}
          />
        )}
        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            {row.sourceName}
          </Text>
          <View style={styles.statistics}>
            {columns
              .filter((column) => column !== points)
              .map((column) => (
                <View key={column} style={styles.statistic}>
                  <Text
                    style={[tokens.typography.metadata, { color: colors.text }]}
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
        </View>
      </View>
      {points && (
        <View style={styles.points}>
          <Text style={[tokens.typography.headingLg, { color: colors.text }]}>
            {row.statistics[points] ?? "—"}
          </Text>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {standingColumnLabel(points)}
          </Text>
        </View>
      )}
    </>
  );
  const style = [
    styles.row,
    {
      borderBottomColor: colors.border,
      borderBottomWidth: last ? 0 : tokens.border.thin,
    },
  ];
  if (row.team) {
    const teamId = row.team.id;
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ selected: highlighted }}
        onPress={() => void sporting.navigate("team", teamId)}
        style={style}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  stateControls: { paddingBottom: 0 },
  content: { paddingTop: tokens.spacing.lg },
  standings: { gap: tokens.spacing.lg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
  },
  participation: { flex: 1, minWidth: 0 },
  toolbar: {
    flexShrink: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.xs,
  },
  layoutAction: {
    minWidth: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  layoutVisual: {
    width: tokens.size.control.compact,
    height: tokens.size.control.compact,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.compact,
    borderBottomWidth: tokens.border.thin,
    minHeight: tokens.sporting.standingsRowMinHeight,
  },
  marker: {
    position: "absolute",
    left: -tokens.spacing.sm,
    height: tokens.sporting.standingsMarkerHeight,
    width: tokens.sporting.standingsMarkerWidth,
    borderRadius: tokens.sporting.standingsMarkerWidth / 2,
  },
  position: {
    width: tokens.sporting.standingsRankWidth,
    minHeight: tokens.sporting.standingsRankHeight,
    textAlign: "center",
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minWidth: 0,
  },
  copy: { flex: 1, gap: tokens.spacing.xs },
  statistics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.compact,
  },
  statistic: { flexDirection: "row", gap: tokens.spacing.xs },
  points: {
    alignItems: "flex-end",
    minWidth: tokens.sporting.standingsPointsWidth,
  },
});
