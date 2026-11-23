import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { LoadingGroup } from "@/shared/components/loading-group";
import { PageContent, PageScrollView } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionControlResponse,
  CollectionResultSummaryResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { createCollectionQueries } from "../api/collection-queries";
import {
  useCollectionControl,
  type useCollectionControls,
} from "../api/use-collection-controls";
import type { useCollectionSeason } from "../api/use-collection-season";
import {
  CollectionControl,
  CollectionExecutionSkeleton,
} from "../components/collection-control";
import { CollectionLink } from "../components/collection-link";

interface CollectionFollowUpProps {
  control: CollectionControlResponse;
  controls: ReturnType<typeof useCollectionControls>;
  season?: CollectionSeasonResponse;
  active?: boolean;
  onOpenBilan: () => void;
  seasonQuery?: Pick<
    ReturnType<typeof useCollectionSeason>["season"],
    "isFetching" | "refetch"
  >;
}

/** Observes execution and aggregate results independently for the selected control. */
export function CollectionFollowUp({
  control,
  controls,
  season,
  active = true,
  onOpenBilan,
  seasonQuery,
}: Readonly<CollectionFollowUpProps>) {
  const editing = useCollectionControl(control.id, controls);
  const { authority, query } = editing;
  const results = useQuery(
    createCollectionQueries(authority).resultSummary(control.id),
  );
  const resultsFeedback = (
    <ReadFeedback
      query={results}
      loadingContent={
        <LoadingGroup label="Chargement des résultats de collecte">
          <ResultSummarySkeleton />
        </LoadingGroup>
      }
    />
  );
  const commandPending =
    editing.activity.isPending || editing.request.isPending;
  const fetching =
    query.isFetching || results.isFetching || !!seasonQuery?.isFetching;
  if (hasReadError(query)) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback query={query} loadingContent={null} />
        </ScreenState>
      </PageScrollView>
    );
  }

  return (
    <PageScrollView
      refreshControl={
        <DataRefreshControl
          fetching={fetching}
          enabled={active && !commandPending}
          onRefresh={async () => {
            if (active && !commandPending && !fetching) {
              await Promise.all([
                query.refetch({ cancelRefetch: false }),
                results.refetch({ cancelRefetch: false }),
                seasonQuery?.refetch({ cancelRefetch: false }),
              ]);
            }
          }}
        />
      }
    >
      <PageContent style={styles.sections}>
        <CollectionControl
          control={control}
          editing={editing}
          season={season}
          active={active}
        />
        {hasReadError(results) ? (
          <ScreenState style={styles.resultFeedback}>
            {resultsFeedback}
          </ScreenState>
        ) : results.data ? (
          <ResultSummary summary={results.data} onOpenBilan={onOpenBilan} />
        ) : (
          resultsFeedback
        )}
      </PageContent>
    </PageScrollView>
  );
}

export function CollectionFollowUpLoading() {
  return (
    <LoadingGroup
      label="Chargement du suivi de collecte"
      style={styles.sections}
    >
      <CollectionExecutionSkeleton />
      <ResultSummarySkeleton />
    </LoadingGroup>
  );
}

function ResultSummarySkeleton() {
  return (
    <Surface style={styles.summary}>
      <TextSkeleton role="title" width="56%" />
      <TextSkeleton role="metadata" width="36%" />
      <View style={styles.distribution}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.summaryRow}>
            {[0, 1].map((column) => (
              <View key={column} style={styles.count}>
                <TextSkeleton role="title" width="20%" />
                <TextSkeleton role="metadata" width="52%" />
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.linkSlot}>
        <TextSkeleton role="label" width="32%" />
      </View>
    </Surface>
  );
}

/** Counts the server's whole-control projection, which is independent of any Bilan criteria or page. */
function ResultSummary({
  summary,
  onOpenBilan,
}: Readonly<{
  summary: CollectionResultSummaryResponse;
  onOpenBilan: () => void;
}>) {
  const { colors } = useTheme();
  const total =
    summary.success + summary.partial + summary.failed + summary.unconfirmed;
  return (
    <Surface style={styles.summary}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.headingSm, { color: colors.text }]}
      >
        Résultats actuels
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {total === 1 ? "1 résultat affiché" : `${total} résultats affichés`}
      </Text>
      <View style={styles.distribution}>
        <View style={styles.summaryRow}>
          <OutcomeCount
            count={summary.success}
            label={summary.success === 1 ? "réussite" : "réussites"}
            color={colors.onSuccessSubtle}
          />
          <OutcomeCount
            count={summary.partial}
            label={
              summary.partial === 1 ? "résultat partiel" : "résultats partiels"
            }
            color={colors.warningOnSurface}
          />
        </View>
        <View style={styles.summaryRow}>
          <OutcomeCount
            count={summary.failed}
            label={summary.failed === 1 ? "échec" : "échecs"}
            color={colors.error}
          />
          <OutcomeCount
            count={summary.unconfirmed}
            label={summary.unconfirmed === 1 ? "non confirmé" : "non confirmés"}
            color={colors.warningOnSurface}
          />
        </View>
      </View>
      <CollectionLink label="Voir le bilan" onPress={onOpenBilan} centered />
    </Surface>
  );
}

function OutcomeCount({
  count,
  label,
  color,
}: Readonly<{ count: number; label: string; color: string }>) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${count} ${label}`}
      style={styles.count}
    >
      <Text style={[tokens.typography.title, { color }]}>{count}</Text>
      <Text
        style={[
          tokens.typography.metadata,
          styles.countLabel,
          { color: colors.secondaryText },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: tokens.spacing.md },
  resultFeedback: { padding: 0 },
  summary: { gap: tokens.spacing.sm },
  distribution: { gap: tokens.spacing.sm },
  summaryRow: { flexDirection: "row", gap: tokens.spacing.lg },
  count: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  countLabel: { flexShrink: 1 },
  linkSlot: {
    minHeight: tokens.touch.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
});
