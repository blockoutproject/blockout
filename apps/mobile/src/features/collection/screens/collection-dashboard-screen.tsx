import { isResourceReadRefused } from "@/shared/api/access-denied";
import { PageFlatList } from "@/shared/components/page-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CollectionControlResponse } from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { Button } from "@/shared/components/button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListSeparator } from "@/shared/components/list-separator";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";

import { EmptyState } from "@/shared/components/state-card";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import {
  useCollectionControl,
  useCollectionControls,
} from "../api/use-collection-controls";
import { useCollectionSeasons } from "../api/use-collection-season";
import { createCollectionQueries } from "../api/collection-queries";
import { CollectionControl } from "../components/collection-control";
import {
  CollectionLoading,
  CollectionControlLoading,
  CollectionResultsLoading,
} from "../components/collection-loading";
import { CollectionResult } from "../components/collection-result";
import { CollectionDestinationLink } from "../components/collection-destination-link";
import { seasonStatus } from "../components/collection-season-summary";
import {
  collectionResultKey,
  collectionResultRows,
} from "../model/collection-result-presentation";

type ClubCollectionFamily = "club-sheets" | "geocoding";

const familyLabels: Record<ClubCollectionFamily, string> = {
  "club-sheets": "Fiches clubs",
  geocoding: "Géocodage",
};

/** The landing menu requires its bounded seasons read; control commands own separate destinations. */
export function CollectionDashboardScreen() {
  const { authority, query } = useCollectionSeasons();
  const { colors } = useTheme();
  const router = useRouter();
  const failed = hasReadError(query);

  const FeedbackLayout = isAccessLoading(authority) ? PageContent : ScreenState;
  return (
    <Page header={<PageHeader title="Collectes" />}>
      <PageScrollView
        refreshControl={
          authority.enabled && !failed ? (
            <DataRefreshControl
              onRefresh={() => query.refetch({ cancelRefetch: false })}
              fetching={query.isFetching}
            />
          ) : undefined
        }
      >
        {!authority.enabled ? (
          <FeedbackLayout>
            <AccessFeedback
              {...authority}
              loadingContent={<CollectionLoading />}
            />
          </FeedbackLayout>
        ) : failed ? (
          <ScreenState>
            <ReadFeedback
              query={query}
              loadingContent={<CollectionLoading />}
            />
          </ScreenState>
        ) : (
          <PageContent>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Compétitions
            </Text>
            {query.data?.items.map((season) => (
              <CollectionDestinationLink
                key={season.id}
                label={season.label}
                detail={seasonStatus(season)}
                icon={CalendarDays}
                onPress={() =>
                  router.push({
                    pathname: "/collection/[seasonId]",
                    params: { seasonId: season.id },
                  })
                }
              />
            ))}
            {query.data?.items.length === 0 && (
              <EmptyState title="Aucune saison découverte">
                <ReloadButton
                  fetching={query.isFetching}
                  onReload={() => query.refetch({ cancelRefetch: false })}
                />
              </EmptyState>
            )}
            <ReadFeedback
              query={query}
              loadingContent={<CollectionLoading />}
            />
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Clubs · indépendants des saisons
            </Text>
            <CollectionDestinationLink
              label="Fiches clubs"
              icon={Users}
              onPress={() =>
                router.push({
                  pathname: "/collection/clubs/[family]",
                  params: { family: "club-sheets" },
                })
              }
            />
            <CollectionDestinationLink
              label="Géocodage"
              icon={MapPin}
              onPress={() =>
                router.push({
                  pathname: "/collection/clubs/[family]",
                  params: { family: "geocoding" },
                })
              }
            />
          </PageContent>
        )}
      </PageScrollView>
    </Page>
  );
}

/** Club sheets and geocoding read only the two independent seasonless controls. */
export function CollectionControlScreen({
  family,
}: Readonly<{ family: ClubCollectionFamily }>) {
  const controls = useCollectionControls();
  const { authority, query } = controls;
  const selected = query.data?.items.find(
    (control) => control.family === family && control.seasonId === undefined,
  );
  const pending = !authority.enabled
    ? isAccessLoading(authority)
    : !hasReadError(query) && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (!authority.enabled || !selected) {
    return (
      <Page header={<PageHeader title={familyLabels[family]} />}>
        <PageScrollView>
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<CollectionControlLoading />}
              />
            ) : (
              <ReadFeedback
                query={query}
                loadingContent={<CollectionControlLoading />}
                failed={!!query.data && !selected}
              />
            )}
          </FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <ControlDashboard
      key={`${authority.session.subject}/${selected.id}`}
      control={selected}
      controls={controls}
      family={family}
    />
  );
}

/** Results own their read recovery; continuation preserves received evidence and commands remain independent. */
function ControlDashboard({
  control,
  controls,
  family,
}: Readonly<{
  control: CollectionControlResponse;
  controls: ReturnType<typeof useCollectionControls>;
  family: ClubCollectionFamily;
}>) {
  const editing = useCollectionControl(control.id, controls);
  const { authority, query } = editing;
  const results = useInfiniteQuery(
    createCollectionQueries(authority).results(control.id),
  );
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [diagnostics, setDiagnostics] = useState(false);
  const fetching = query.isFetching || results.isFetching;
  const commandPending =
    editing.activity.isPending || editing.request.isPending;
  const continuationBusy =
    fetching || commandPending || authority.account.isRefetching;
  const refused = isResourceReadRefused(results.error);
  const continuationFailed =
    !!results.data && results.isFetchNextPageError && !refused;
  const continuationVisible = continuationFailed || results.isFetchingNextPage;
  const resultsFailed = hasReadError(results) && !continuationFailed;
  const rows = resultsFailed ? [] : collectionResultRows(results.data?.pages);

  /** Refreshes displayed projections independently of collection commands. */
  async function refresh() {
    if (commandPending || fetching) {
      return;
    }
    await Promise.all([
      query.refetch({ cancelRefetch: false }),
      results.refetch({ cancelRefetch: false }),
    ]);
  }

  /** The shared continuation command preserves scope; automatic edges separately exclude read errors. */
  async function loadMore() {
    if (
      !authority.enabled ||
      !navigation.isFocused() ||
      !results.hasNextPage ||
      resultsFailed ||
      continuationBusy
    ) {
      return;
    }
    await results.fetchNextPage({ cancelRefetch: false });
  }

  /** Renders current control context and display actions independently of result-list feedback. */
  function renderHeader() {
    return (
      <View
        style={[
          !rows.length && !continuationVisible && pageContentStyle,
          styles.section,
        ]}
      >
        <CollectionControl control={control} editing={editing} />
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Derniers résultats observés
        </Text>
        <Button
          label={
            diagnostics ? "Masquer les diagnostics" : "Afficher les diagnostics"
          }
          variant="secondary"
          onPress={() => setDiagnostics(!diagnostics)}
        />
      </View>
    );
  }

  /** Distinguishes the initial result skeleton from failed or genuinely empty result reads. */
  function renderEmptyResults() {
    if (continuationVisible) {
      return null;
    }
    if (results.isPending || resultsFailed) {
      const ResultsFeedbackLayout = resultsFailed ? ScreenState : PageContent;
      return (
        <ResultsFeedbackLayout>
          <ReadFeedback
            query={results}
            loadingContent={<CollectionResultsLoading />}
          />
        </ResultsFeedbackLayout>
      );
    }
    return (
      <ScreenState>
        <EmptyState title="Aucun résultat observé">
          <ReloadButton
            fetching={results.isFetching}
            onReload={() => results.refetch({ cancelRefetch: false })}
            disabled={commandPending || query.isFetching}
          />
        </EmptyState>
      </ScreenState>
    );
  }

  const header = <PageHeader title={familyLabels[family]} />;
  if (hasReadError(query)) {
    return (
      <Page header={header}>
        <PageScrollView>
          <ScreenState>
            <ReadFeedback query={query} loadingContent={null} />
          </ScreenState>
        </PageScrollView>
      </Page>
    );
  }

  return (
    <Page header={header}>
      <PageFlatList
        testID="collection-results-list"
        alwaysBounceVertical
        refreshControl={
          <DataRefreshControl
            enabled={!commandPending && !results.isFetchingNextPage}
            onRefresh={refresh}
            fetching={fetching}
          />
        }
        data={rows}
        keyExtractor={collectionResultKey}
        contentContainerStyle={
          rows.length > 0 || continuationVisible
            ? pageContentStyle
            : styles.emptyList
        }
        ListHeaderComponent={renderHeader()}
        ItemSeparatorComponent={ListSeparator}
        onEndReached={() => {
          if (!results.isError) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <CollectionResult result={item} diagnostics={diagnostics} />
        )}
        ListEmptyComponent={renderEmptyResults() ?? undefined}
        ListFooterComponent={
          <>
            {!resultsFailed && results.hasNextPage ? (
              <ListContinuation
                loading={results.isFetchingNextPage}
                failed={continuationFailed}
                disabled={continuationBusy}
                onRetry={loadMore}
              />
            ) : undefined}
            <BottomContentSpacer />
          </>
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  emptyList: { flexGrow: 1 },
  section: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
});
