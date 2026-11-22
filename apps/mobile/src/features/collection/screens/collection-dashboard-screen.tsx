import { PageFlatList } from "@/shared/components/page-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { CalendarDays, MapPin, RefreshCw, Users } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { isAccessDenied } from "@/shared/api/access-denied";
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

import { EmptyState } from "@/shared/components/state-card";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import {
  useCollectionControl,
  useCollectionControls,
} from "../api/use-collection-controls";
import { useCollectionSeasons } from "../api/use-source-preparation";
import { createCollectionQueries } from "../api/collection-queries";
import { CollectionControl } from "../components/collection-control";
import {
  CollectionLoading,
  CollectionControlLoading,
  CollectionResultsLoading,
} from "../components/collection-loading";
import { CollectionResult } from "../components/collection-result";
import { PreparationLink } from "../components/preparation-link";
import { seasonStatus } from "../components/source-summary";
import { collectionResultKey } from "../model/collection-result-presentation";

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

  const FeedbackLayout =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      !hasReadError(authority.account) &&
      authority.account.isLoading)
      ? PageContent
      : ScreenState;
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
              <PreparationLink
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
                <Button
                  label="Actualiser"
                  leadingIcon={RefreshCw}
                  onPress={() => void query.refetch({ cancelRefetch: false })}
                  loading={query.isFetching}
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
            <PreparationLink
              label="Fiches clubs"
              icon={Users}
              onPress={() =>
                router.push({
                  pathname: "/collection/clubs/[family]",
                  params: { family: "club-sheets" },
                })
              }
            />
            <PreparationLink
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
  const { authority, query } = useCollectionControls();
  const selected = query.data?.items.find(
    (control) => control.family === family && control.seasonId === undefined,
  );
  const sessionPending =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      !hasReadError(authority.account) &&
      authority.account.isLoading);
  const pending = !authority.enabled
    ? sessionPending
    : !hasReadError(query) && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (!authority.enabled || !selected || hasReadError(query)) {
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
      controlId={selected.id}
      family={family}
    />
  );
}

/** Results own their read recovery; continuation preserves received evidence and commands remain independent. */
function ControlDashboard({
  controlId,
  family,
}: Readonly<{
  controlId: string;
  family: ClubCollectionFamily;
}>) {
  const editing = useCollectionControl(controlId);
  const { authority, query } = editing;
  const results = useInfiniteQuery(
    createCollectionQueries(authority).results(controlId),
  );
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [diagnostics, setDiagnostics] = useState(false);
  const fetching = query.isFetching || results.isFetching;
  const commandPending =
    editing.activity.isPending || editing.request.isPending;
  const continuationBusy =
    fetching || commandPending || authority.account.isRefetching;
  const current = query.data;
  const matches =
    !hasReadError(query) &&
    current?.family === family &&
    current.seasonId === undefined;
  const continuationVisible =
    !!results.data &&
    !isAccessDenied(results.error) &&
    (results.isFetchNextPageError || results.isFetchingNextPage);
  const resultsFailed = hasReadError(results) && !results.isFetchNextPageError;
  // Updated evidence may cross page boundaries; keep its latest value in the first observed position.
  const rows =
    hasReadError(query) || resultsFailed || isAccessDenied(results.error)
      ? []
      : [
          ...new Map(
            (results.data?.pages ?? [])
              .flatMap((page) => page.items)
              .map((row) => [collectionResultKey(row), row]),
          ).values(),
        ];

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
      !matches ||
      !navigation.isFocused() ||
      !results.hasNextPage ||
      isAccessDenied(query.error) ||
      isAccessDenied(results.error) ||
      (results.isError && !results.isFetchNextPageError) ||
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
        {current && <CollectionControl control={current} editing={editing} />}
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

  const sessionPending =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      !hasReadError(authority.account) &&
      authority.account.isLoading);
  const pending = !authority.enabled
    ? sessionPending
    : !hasReadError(query) && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

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
          <Button
            label="Actualiser"
            leadingIcon={RefreshCw}
            onPress={() => void results.refetch({ cancelRefetch: false })}
            loading={results.isFetching}
            disabled={commandPending || query.isFetching}
          />
        </EmptyState>
      </ScreenState>
    );
  }

  return (
    <Page header={<PageHeader title={familyLabels[family]} />}>
      {!authority.enabled || !matches ? (
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
                failed={!!current && !matches}
              />
            )}
          </FeedbackLayout>
        </PageScrollView>
      ) : (
        <PageFlatList
          testID="collection-results-list"
          alwaysBounceVertical
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                enabled={!commandPending && !results.isFetchingNextPage}
                onRefresh={refresh}
                fetching={fetching}
              />
            ) : undefined
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
            if (!query.isError && !results.isError) {
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
              {!resultsFailed &&
              !isAccessDenied(results.error) &&
              results.hasNextPage ? (
                <ListContinuation
                  loading={results.isFetchingNextPage}
                  failed={results.isFetchNextPageError}
                  disabled={continuationBusy}
                  onRetry={loadMore}
                />
              ) : undefined}
              <BottomContentSpacer />
            </>
          }
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  emptyList: { flexGrow: 1 },
  section: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
});
