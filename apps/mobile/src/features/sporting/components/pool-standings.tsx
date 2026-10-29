import { useQuery } from "@tanstack/react-query";
import { useSportingNavigation } from "../navigation";
import { Columns3, List } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TabScrollView } from "react-native-collapsible-tab";
import type {
  PoolSummaryResponse,
  StandingRowResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageContent } from "../../../shared/components/page";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PagedStateScrollView } from "../../../shared/components/paged-tabs";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { resourceUnavailable } from "../model/consultation-availability";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { SportingLogo } from "./sporting-identity";
import { StandingCards } from "./standing-cards";

/** One exact pool's independently retained table; team emphasis uses identity alone, never rank. */
export interface PoolStandingsProps {
  pool: PoolSummaryResponse;
  highlightTeamId?: string;
  /** RNCT retains visited panels; an inactive table cannot release an old sporting opening. */
  active?: boolean;
  /** Optional phase navigation belongs above this table in a team participation panel. */
  children?: ReactNode;
}

/** Lazy panel read through the generated client; RNCT owns scrolling and the active-tab refresh. */
export function PoolStandings({
  pool,
  highlightTeamId,
  active = true,
  children,
}: PoolStandingsProps) {
  const queries = useConsultationQueries();
  const standings = useQuery(queries.standings(pool.pool.id));
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const [layout, setLayout] = useState<"list" | "cards">("list");
  const data = standings.data;
  const columns = data?.columns ?? [];

  /** Refetches only this table; ordinary failure preserves its original supplier attribution. */
  async function refresh() {
    feedback.clear();
    const result = await standings.refetch({ cancelRefetch: false });
    if (
      result.isError &&
      result.data &&
      result.data.availability !== "unavailable" &&
      !resourceUnavailable(result.error)
    )
      feedback.error();
  }

  const hasRows = data?.availability === "available" && data.rows.length > 0;

  const refreshControl =
    data && data.availability !== "unavailable" ? (
      <DataRefreshControl
        refreshing={standings.isRefetching}
        onRefresh={() => void refresh()}
      />
    ) : undefined;
  if (!hasRows)
    return (
      <PagedStateScrollView refreshControl={refreshControl}>
        {children && <PageContent>{children}</PageContent>}
        <ScreenState>
          {!data ? (
            <ReadFeedback query={standings} />
          ) : data.availability === "unavailable" ? (
            <ErrorState
              onRetry={() => void refresh()}
              retrying={standings.isFetching}
            />
          ) : (
            <EmptyState
              title={
                data.availability === "not-published"
                  ? "Pas de classement pour cette phase"
                  : "Aucune équipe dans ce classement"
              }
            />
          )}
        </ScreenState>
      </PagedStateScrollView>
    );
  return (
    <TabScrollView
      alwaysBounceVertical
      contentContainerStyle={styles.scrollContent}
      refreshControl={refreshControl}
    >
      <PageContent>
        {children}
        <View>
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
                style={[
                  styles.layoutAction,
                  {
                    backgroundColor:
                      layout === value ? colors.subtle : undefined,
                  },
                ]}
              >
                <Icon size={tokens.size.icon.md} color={colors.icon} />
              </Pressable>
            ))}
          </View>
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
    </TabScrollView>
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
  const points = columns.at(-1);
  const medal =
    row.position === 1
      ? "first"
      : row.position === 2
        ? "second"
        : row.position === 3
          ? "third"
          : undefined;
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
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
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
                    {column}
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
            {points}
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
  scrollContent: { flexGrow: 1 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing.xs,
  },
  layoutAction: {
    minWidth: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    paddingLeft: tokens.spacing.xs,
    borderBottomWidth: tokens.border.thin,
    minHeight: tokens.sporting.teamMinHeight,
  },
  marker: {
    position: "absolute",
    left: 0,
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
