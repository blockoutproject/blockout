import { controlOpacity } from "@/shared/components/control-styles";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageContent, PageScrollView } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionResultSummaryResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { createCollectionQueries } from "../api/collection-queries";
import { useCollectionControl } from "../api/use-collection-controls";
import { CollectionControl } from "../components/collection-control";
import {
  CollectionControlLoading,
  CollectionSummaryLoading,
} from "../components/collection-loading";

interface CollectionFollowUpProps {
  controlId: string;
  provider: CollectionProviderEnum;
  season: CollectionSeasonResponse;
  active: boolean;
  onOpenBilan: () => void;
  refreshSeason?: {
    fetching: boolean;
    refetch: () => Promise<unknown>;
  };
}

/** Observes execution and aggregate results independently inside the provider's Suivi tab. */
export function CollectionFollowUp({
  controlId,
  provider,
  season,
  active,
  onOpenBilan,
  refreshSeason,
}: Readonly<CollectionFollowUpProps>) {
  const editing = useCollectionControl(controlId, season.id);
  const { authority, query } = editing;
  const results = useQuery(
    createCollectionQueries(authority).resultSummary(controlId),
  );
  const current = query.data;
  const matches =
    current?.family === provider && current.seasonId === season.id;
  const controlFailed = hasReadError(query) || (!!current && !matches);
  const blocked = !authority.enabled || !matches || controlFailed;
  const summary = results.data?.summary;
  const summaryMissing = results.isSuccess && !summary;
  const resultsFailed = hasReadError(results) || summaryMissing;
  const resultsFeedback = (
    <ReadFeedback
      query={results}
      failed={summaryMissing}
      loadingContent={<CollectionSummaryLoading />}
    />
  );
  const commandPending =
    editing.activity.isPending || editing.request.isPending;
  const fetching =
    query.isFetching || results.isFetching || !!refreshSeason?.fetching;
  const FeedbackLayout =
    query.isLoading && !controlFailed ? PageContent : ScreenState;

  return (
    <PageScrollView
      refreshControl={
        <DataRefreshControl
          fetching={fetching}
          enabled={active && !blocked && !commandPending}
          onRefresh={async () => {
            if (!fetching) {
              await Promise.all([
                query.refetch({ cancelRefetch: false }),
                results.refetch({ cancelRefetch: false }),
                refreshSeason?.refetch(),
              ]);
            }
          }}
        />
      }
    >
      {blocked ? (
        <FeedbackLayout>
          <ReadFeedback
            query={query}
            failed={!!current && !matches}
            loadingContent={<CollectionControlLoading />}
          />
        </FeedbackLayout>
      ) : (
        <PageContent style={styles.sections}>
          <CollectionControl
            control={current}
            editing={editing}
            season={season}
            active={active}
          />
          {resultsFailed ? (
            <ScreenState style={styles.resultFeedback}>
              {resultsFeedback}
            </ScreenState>
          ) : summary ? (
            <ResultSummary summary={summary} onOpenBilan={onOpenBilan} />
          ) : (
            resultsFeedback
          )}
        </PageContent>
      )}
    </PageScrollView>
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
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Voir le bilan"
        onPress={onOpenBilan}
        style={({ pressed }) => [
          styles.bilanLink,
          { opacity: controlOpacity(false, pressed) },
        ]}
      >
        <Text
          style={[
            tokens.typography.strong,
            styles.linkLabel,
            { color: colors.text },
          ]}
        >
          Voir le bilan
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      </Pressable>
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
  bilanLink: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
  },
  linkLabel: { flexShrink: 1, textAlign: "center" },
});
