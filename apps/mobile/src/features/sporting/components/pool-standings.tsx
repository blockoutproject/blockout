import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Columns3, List } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TabScrollView } from "react-native-collapsible-tab";
import type {
  PoolSummaryResponse,
  StandingRowResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageContent } from "../../../shared/components/page";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { resourceUnavailable } from "../model/consultation-availability";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import { SportingLogo } from "./sporting-identity";
import { ResourceText } from "./resource-text";

/** One exact pool's independently retained table; team emphasis uses identity alone, never rank. */
export interface PoolStandingsProps {
  pool: PoolSummaryResponse;
  highlightTeamId?: string;
  /** Optional phase navigation belongs above this table in a team participation panel. */
  children?: ReactNode;
}

/** Lazy panel read through the generated client; RNCT owns scrolling and the active-tab refresh. */
export function PoolStandings({
  pool,
  highlightTeamId,
  children,
}: PoolStandingsProps) {
  const queries = useConsultationQueries();
  const standings = useQuery(queries.standings(pool.pool.id));
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const [layout, setLayout] = useState<"list" | "columns">("list");
  const data = standings.data;
  const columns = data?.columns ?? [];

  /** Refetches only this table; ordinary failure preserves its original supplier attribution. */
  async function refresh() {
    const result = await standings.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !resourceUnavailable(result.error))
      feedback.error();
  }

  const content =
    data?.availability === "available" ? (
      <View>
        {data.rows.length === 0 ? (
          <ResourceText>Aucune ligne publiée</ResourceText>
        ) : (
          <>
            <View
              style={styles.toolbar}
              accessibilityRole="radiogroup"
              accessibilityLabel="Présentation du classement"
            >
              {(
                [
                  ["columns", "Afficher en colonnes", Columns3],
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
            {layout === "columns" ? (
              <ScrollView
                horizontal
                accessibilityLabel="Colonnes officielles du classement"
              >
                <View>
                  <View
                    style={[styles.tableRow, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.position,
                        tokens.typography.metadata,
                        { color: colors.secondaryText },
                      ]}
                    >
                      Rang
                    </Text>
                    <Text
                      style={[
                        styles.teamColumn,
                        tokens.typography.metadata,
                        { color: colors.secondaryText },
                      ]}
                    >
                      Équipe
                    </Text>
                    {columns.map((column) => (
                      <Text
                        key={column}
                        style={[
                          styles.statColumn,
                          tokens.typography.metadata,
                          { color: colors.secondaryText },
                        ]}
                      >
                        {column}
                      </Text>
                    ))}
                  </View>
                  {data.rows.map((row, index) => (
                    <StandingEntry
                      key={index}
                      row={row}
                      columns={columns}
                      tabular
                      highlighted={
                        row.team !== undefined &&
                        row.team.id === highlightTeamId
                      }
                      color={pool.classification.division?.color}
                      last={index === data.rows.length - 1}
                    />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View>
                {data.rows.map((row, index) => (
                  <StandingEntry
                    key={index}
                    row={row}
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
          </>
        )}
        <ResourceText>
          {data.observedAt
            ? `Observé le ${new Date(data.observedAt).toLocaleString("fr-FR")}`
            : "Date d’observation inconnue"}
        </ResourceText>
      </View>
    ) : data ? (
      <ResourceText>
        {data.availability === "not-published"
          ? "Classement non publié"
          : "Classement indisponible pour le moment"}
      </ResourceText>
    ) : (
      <ReadFeedback query={standings} />
    );

  return (
    <TabScrollView
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl
          refreshing={standings.isRefetching}
          onRefresh={() => void refresh()}
        />
      }
    >
      <PageContent>
        {children}
        {content}
        {data?.lastAttemptFailed && (
          <ResourceText>
            {data.availability === "available"
              ? "Dernière acquisition échouée ; les informations officielles conservées restent affichées."
              : "Dernière acquisition échouée."}
          </ResourceText>
        )}
        {data && standings.isError && (
          <ResourceText>
            {data.availability === "available"
              ? "Dernière actualisation impossible ; les informations conservées restent affichées."
              : "Dernière actualisation impossible."}
          </ResourceText>
        )}
      </PageContent>
    </TabScrollView>
  );
}

/** Official source rows have no row identity; their list order is presentation, never a rank. */
interface StandingEntryProps {
  row: StandingRowResponse;
  columns: string[];
  highlighted: boolean;
  tabular?: boolean;
  color?: string;
  last: boolean;
}

/** Preserves source labels and optional values; only an explicitly associated team opens a route. */
function StandingEntry({
  row,
  columns,
  highlighted,
  tabular = false,
  color,
  last,
}: StandingEntryProps) {
  const { colors } = useTheme();
  const router = useRouter();
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
      {highlighted && !tabular && (
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
      <View style={[styles.identity, tabular && styles.teamColumn]}>
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
          {!tabular && (
            <View style={styles.statistics}>
              {columns
                .filter((column) => column !== points)
                .map((column) => (
                  <View key={column} style={styles.statistic}>
                    <Text
                      style={[
                        tokens.typography.metadata,
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
                      {column}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </View>
      {tabular
        ? columns.map((column) => (
            <Text
              key={column}
              accessibilityLabel={`${column} : ${row.statistics[column] ?? "non renseigné"}`}
              style={[
                styles.statColumn,
                tokens.typography.body,
                { color: colors.text },
              ]}
            >
              {row.statistics[column] ?? "—"}
            </Text>
          ))
        : points && (
            <View style={styles.points}>
              <Text
                style={[tokens.typography.headingLg, { color: colors.text }]}
              >
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
    tabular && styles.tableRow,
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
        onPress={() =>
          router.push({ pathname: "/teams/[teamId]", params: { teamId } })
        }
        style={style}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
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
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    borderBottomWidth: tokens.border.thin,
    paddingVertical: tokens.spacing.md,
  },
  teamColumn: {
    flex: 0,
    width: tokens.sporting.dateMinWidth + tokens.size.media.row,
  },
  statColumn: {
    width: tokens.size.control.default + tokens.spacing.lg,
    textAlign: "center",
  },
});
