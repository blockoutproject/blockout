import { PageFlatList } from "../../../shared/components/page-list";
import type { QueryObserverResult } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { CalendarDays, MapPin, RefreshCw, Users } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  CollectionFamilyEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { ListSeparator } from "../../../shared/components/list-separator";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScreenState } from "../../../shared/components/screen-state";
import { ReadFeedback } from "../../../shared/components/read-feedback";

import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { AccessFeedback } from "../../access/components/access-feedback";
import {
  useCollectionControl,
  useCollectionControls,
} from "../api/use-collection-controls";
import {
  useCollectionSeason,
  useCollectionSeasons,
} from "../api/use-source-preparation";
import { CollectionControl } from "../components/collection-control";
import {
  CollectionLoading,
  CollectionControlLoading,
  CollectionResultsLoading,
} from "../components/collection-loading";
import { CollectionResult } from "../components/collection-result";
import { PreparationLink } from "../components/preparation-link";
import { SeasonIdentity, seasonStatus } from "../components/source-summary";
import { ProviderSourcesScreen } from "./provider-sources-screen";
import { isCollectionReadRefused } from "../api/collection-queries";

/** Navigation labels correspond to F01's four independent control families. */
const familyLabels: Record<CollectionFamilyEnum, string> = {
  ffvb: "FFVB",
  lnv: "LNV",
  "club-sheets": "Fiches clubs",
  geocoding: "Géocodage",
};

/** Keeps authorized bounded seasons through technical rereads; independent club destinations have no pagination. */
export function CollectionDashboardScreen() {
  const { authority, query } = useCollectionSeasons();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const router = useRouter();
  const denied = isAccessDenied(query.error);

  /** Rereads seasons without commands; failures retain authorized rows or use the empty section's error card. */
  async function refresh() {
    const result = await query.refetch({ cancelRefetch: false });
    if (
      result.isError &&
      (result.data?.items.length ?? 0) > 0 &&
      !isAccessDenied(result.error)
    ) {
      feedback.error();
    }
  }

  const FeedbackLayout =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" && authority.account.isLoading)
      ? PageContent
      : ScreenState;
  const blockingState = !authority.enabled ? (
    <AccessFeedback {...authority} loadingContent={<CollectionLoading />} />
  ) : undefined;
  return (
    <Page header={<PageHeader title="Collectes" />}>
      <PageScrollView
        refreshControl={
          authority.enabled ? (
            <DataRefreshControl onRefresh={refresh} />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        ) : (
          <PageContent>
            {authority.enabled && (
              <>
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.heading, { color: colors.text }]}
                >
                  Compétitions
                </Text>
                {(!denied ? query.data?.items : undefined)?.map((season) => (
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
                {!denied &&
                  !query.isError &&
                  query.data?.items.length === 0 && (
                    <EmptyState title="Aucune saison découverte">
                      <Button
                        label="Actualiser"
                        leadingIcon={RefreshCw}
                        onPress={() => void refresh()}
                        loading={query.isFetching}
                      />
                    </EmptyState>
                  )}
                {denied || (query.isError && !query.data?.items.length) ? (
                  <ErrorState
                    onRetry={() => void refresh()}
                    retrying={query.isFetching}
                  />
                ) : (
                  !query.data && (
                    <ReadFeedback
                      query={query}
                      loadingContent={<CollectionLoading />}
                    />
                  )
                )}
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
              </>
            )}
          </PageContent>
        )}
      </PageScrollView>
    </Page>
  );
}

/** Navigable control identity comes from the route; club families deliberately have no season setting. */
export interface CollectionControlScreenProps {
  family: CollectionFamilyEnum;
  seasonId?: string;
}

/** Composes current-season lifecycle only for competition controls, retaining the separate preparation destination. */
export function CollectionControlScreen({
  family,
  seasonId,
}: Readonly<CollectionControlScreenProps>) {
  return seasonId ? (
    <SeasonControlScope family={family} seasonId={seasonId} />
  ) : (
    <ControlScope family={family} />
  );
}

/** A competition command must have a current readable season as well as its control projection. */
function SeasonControlScope({
  family,
  seasonId,
}: Readonly<Required<CollectionControlScreenProps>>) {
  const { authority, season } = useCollectionSeason(seasonId);
  const feedback = useActionFeedback();
  const sessionPending =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      authority.account.isLoading);
  const pending = !authority.enabled
    ? sessionPending
    : !season.data && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (
    !authority.enabled ||
    !season.data ||
    isCollectionReadRefused(season.error)
  ) {
    /** Renders season admission and read feedback before current controls. */
    function renderSeasonState() {
      if (!authority.enabled) {
        return (
          <AccessFeedback
            {...authority}
            loadingContent={<CollectionControlLoading />}
          />
        );
      }
      if (season.isError) {
        return (
          <ErrorState
            onRetry={() =>
              void season.refetch().then((result) => {
                if (
                  result.isError &&
                  result.data &&
                  !isAccessDenied(result.error)
                ) {
                  feedback.error();
                }
              })
            }
            retrying={season.isFetching}
          />
        );
      }
      return (
        <ReadFeedback
          query={season}
          loadingContent={<CollectionControlLoading />}
        />
      );
    }

    return (
      <Page header={<PageHeader title={familyLabels[family]} />}>
        <PageScrollView>
          <FeedbackLayout>{renderSeasonState()}</FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <ControlScope
      family={family}
      season={season.data}
      seasonUnavailable={isCollectionReadRefused(season.error)}
      seasonFetching={season.isFetching}
      rereadSeason={() => season.refetch({ cancelRefetch: false })}
    />
  );
}

/** Selection is read from the complete scope list, never inferred from a provider code or another season. */
function ControlScope({
  family,
  season,
  seasonUnavailable = false,
  seasonFetching = false,
  rereadSeason,
}: Readonly<{
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable?: boolean;
  seasonFetching?: boolean;
  rereadSeason?: () => Promise<QueryObserverResult<CollectionSeasonResponse>>;
}>) {
  const { authority, query } = useCollectionControls(season?.id);
  const feedback = useActionFeedback();
  const selected =
    !isAccessDenied(query.error) &&
    query.data?.items.find(
      (control) => control.family === family && control.seasonId === season?.id,
    );
  // A provider control is created by launch or reconstruction, after source preparation.
  // Reuse that preparation screen while a successful current read confirms no control exists.
  if (
    authority.enabled &&
    season &&
    (family === "ffvb" || family === "lnv") &&
    query.isSuccess &&
    !selected
  ) {
    return <ProviderSourcesScreen seasonId={season.id} provider={family} />;
  }
  const sessionPending =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      authority.account.isLoading);
  const pending = !authority.enabled ? sessionPending : query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (!authority.enabled || !selected) {
    /** Renders control admission and read feedback before selecting its dashboard. */
    function renderControlState() {
      if (!authority.enabled) {
        return (
          <AccessFeedback
            {...authority}
            loadingContent={<CollectionControlLoading />}
          />
        );
      }
      if (query.isError) {
        return (
          <ErrorState
            onRetry={() =>
              void query.refetch().then((result) => {
                if (
                  result.isError &&
                  result.data &&
                  !isAccessDenied(result.error)
                ) {
                  feedback.error();
                }
              })
            }
            retrying={query.isFetching}
          />
        );
      }
      if (query.data) {
        return <ErrorState />;
      }
      return (
        <ReadFeedback
          query={query}
          loadingContent={<CollectionControlLoading />}
        />
      );
    }

    return (
      <Page header={<PageHeader title={familyLabels[family]} />}>
        <PageScrollView>
          <FeedbackLayout>{renderControlState()}</FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <ControlDashboard
      key={`${authority.session.subject}/${selected.id}`}
      controlId={selected.id}
      family={family}
      season={season}
      seasonUnavailable={seasonUnavailable}
      seasonFetching={seasonFetching}
      rereadSeason={rereadSeason}
    />
  );
}

/** Visible list edges append current evidence; technical failures retain authorized rows without changing command ownership. */
function ControlDashboard({
  controlId,
  family,
  season,
  seasonUnavailable,
  seasonFetching,
  rereadSeason,
}: Readonly<{
  controlId: string;
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable: boolean;
  seasonFetching: boolean;
  rereadSeason?: () => Promise<QueryObserverResult<CollectionSeasonResponse>>;
}>) {
  const editing = useCollectionControl(controlId, season?.id);
  const { authority, query, results } = editing;
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [diagnostics, setDiagnostics] = useState(false);
  const refreshing =
    query.isRefetching ||
    results.isRefetching ||
    seasonFetching ||
    authority.account.isRefetching;
  const current = query.data;
  const matches =
    !isAccessDenied(query.error) &&
    current?.family === family &&
    current.seasonId === season?.id;
  const continuationVisible =
    !!results.data &&
    !isAccessDenied(results.error) &&
    (results.isFetchNextPageError || results.isFetchingNextPage);
  // Updated evidence may cross page boundaries; keep its latest value in the first observed position.
  const rows =
    isAccessDenied(query.error) || isAccessDenied(results.error)
      ? []
      : [
          ...new Map(
            (results.data?.pages ?? [])
              .flatMap((page) => page.items)
              .map((row) => [`${row.scopeId}/${row.stage}/${row.phase}`, row]),
          ).values(),
        ];

  /** Refreshes all displayed projections without resubmitting a mutation, reporting their failures once. */
  async function refresh() {
    if (
      editing.activity.isPending ||
      editing.request.isPending ||
      query.isFetching ||
      results.isFetching ||
      seasonFetching
    ) {
      return;
    }
    feedback.clear();
    const [controlRead, resultsRead, seasonRead] = await Promise.all([
      query.refetch({ cancelRefetch: false }),
      results.refetch({ cancelRefetch: false }),
      rereadSeason?.(),
    ]);
    if (
      [controlRead, seasonRead].some(
        (read) => read?.isError && read.data && !isAccessDenied(read.error),
      ) ||
      (rows.length > 0 &&
        resultsRead.isError &&
        !isAccessDenied(resultsRead.error))
    ) {
      feedback.error();
    }
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
      results.isFetching ||
      (results.isError && !results.isFetchNextPageError) ||
      refreshing ||
      query.isFetching ||
      editing.activity.isPending ||
      editing.request.isPending
    ) {
      return;
    }
    feedback.clear();
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
        {season && <SeasonIdentity season={season} />}
        {season?.state === "closed" && (
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Saison clôturée · historique conservé
          </Text>
        )}
        {current && (
          <CollectionControl
            control={current}
            editing={editing}
            season={season}
            stateUnavailable={seasonUnavailable}
          />
        )}
        {season && (family === "ffvb" || family === "lnv") && (
          <Button
            label={
              season.state === "closed"
                ? "Consulter les sources"
                : "Préparer les sources"
            }
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/collection/[seasonId]/[provider]",
                params: { seasonId: season.id, provider: family },
              })
            }
          />
        )}
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
      authority.account.isLoading);
  const pending = !authority.enabled
    ? sessionPending
    : !current && query.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

  /** Renders the current result-list admission, error or empty state. */
  function renderResultsState() {
    if (!authority.enabled) {
      return (
        <AccessFeedback
          {...authority}
          loadingContent={<CollectionControlLoading />}
        />
      );
    }
    if (query.isError) {
      return (
        <ErrorState
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      );
    }
    if (current) {
      return <ErrorState />;
    }
    return (
      <ReadFeedback
        query={query}
        loadingContent={<CollectionControlLoading />}
      />
    );
  }

  /** Distinguishes the initial result skeleton from failed or genuinely empty result reads. */
  function renderEmptyResults() {
    if (continuationVisible) {
      return null;
    }
    return results.isLoading && !isAccessDenied(results.error) ? (
      <PageContent>
        <CollectionResultsLoading />
      </PageContent>
    ) : (
      <ScreenState>
        {results.isError || results.isPending ? (
          <ErrorState
            onRetry={() => void results.refetch({ cancelRefetch: false })}
            retrying={results.isFetching}
          />
        ) : (
          <EmptyState title="Aucun résultat observé">
            <Button
              label="Actualiser"
              leadingIcon={RefreshCw}
              onPress={() => void results.refetch({ cancelRefetch: false })}
              loading={results.isFetching}
              disabled={
                editing.activity.isPending ||
                editing.request.isPending ||
                query.isFetching ||
                seasonFetching
              }
            />
          </EmptyState>
        )}
      </ScreenState>
    );
  }

  return (
    <Page header={<PageHeader title={familyLabels[family]} />}>
      {!authority.enabled || !matches ? (
        <PageScrollView>
          <FeedbackLayout>{renderResultsState()}</FeedbackLayout>
        </PageScrollView>
      ) : (
        <PageFlatList
          {...hiddenScrollIndicators}
          testID="collection-results-list"
          alwaysBounceVertical
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                enabled={
                  !editing.activity.isPending &&
                  !editing.request.isPending &&
                  !results.isFetchingNextPage
                }
                onRefresh={refresh}
              />
            ) : undefined
          }
          data={rows}
          keyExtractor={(row) => `${row.scopeId}/${row.stage}/${row.phase}`}
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
              {!isAccessDenied(results.error) && results.hasNextPage ? (
                <ListContinuation
                  loading={results.isFetchingNextPage}
                  failed={results.isFetchNextPageError}
                  disabled={
                    results.isFetching ||
                    refreshing ||
                    query.isFetching ||
                    editing.activity.isPending ||
                    editing.request.isPending
                  }
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
