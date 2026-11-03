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
    )
      feedback.error();
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
            <DataRefreshControl
              refreshing={query.isRefetching || authority.account.isRefetching}
              onRefresh={() => void refresh()}
            />
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
}: CollectionControlScreenProps) {
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
}: Required<CollectionControlScreenProps>) {
  const { authority, season } = useCollectionSeason(seasonId);
  const feedback = useActionFeedback();
  const FeedbackLayout = (
    !authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isLoading)
      : !season.data && season.isLoading
  )
    ? PageContent
    : ScreenState;
  if (!authority.enabled || !season.data || isAccessDenied(season.error))
    return (
      <Page header={<PageHeader title={familyLabels[family]} />}>
        <PageScrollView>
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<CollectionControlLoading />}
              />
            ) : season.isError ? (
              <ErrorState
                onRetry={() =>
                  void season.refetch().then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  })
                }
                retrying={season.isFetching}
              />
            ) : (
              <ReadFeedback
                query={season}
                loadingContent={<CollectionControlLoading />}
              />
            )}
          </FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  return (
    <ControlScope
      family={family}
      season={season.data}
      seasonUnavailable={season.isError || season.isFetching}
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
}: {
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable?: boolean;
  seasonFetching?: boolean;
  rereadSeason?: () => Promise<QueryObserverResult<CollectionSeasonResponse>>;
}) {
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
  )
    return <ProviderSourcesScreen seasonId={season.id} provider={family} />;
  const FeedbackLayout = (
    !authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isLoading)
      : query.isLoading
  )
    ? PageContent
    : ScreenState;
  if (!authority.enabled || !selected)
    return (
      <Page header={<PageHeader title={familyLabels[family]} />}>
        <PageScrollView>
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<CollectionControlLoading />}
              />
            ) : query.isError ? (
              <ErrorState
                onRetry={() =>
                  void query.refetch().then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  })
                }
                retrying={query.isFetching}
              />
            ) : query.data ? (
              <ErrorState />
            ) : (
              <ReadFeedback
                query={query}
                loadingContent={<CollectionControlLoading />}
              />
            )}
          </FeedbackLayout>
        </PageScrollView>
      </Page>
    );
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
}: {
  controlId: string;
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable: boolean;
  seasonFetching: boolean;
  rereadSeason?: () => Promise<QueryObserverResult<CollectionSeasonResponse>>;
}) {
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
  const rows =
    isAccessDenied(query.error) || isAccessDenied(results.error)
      ? []
      : (results.data?.pages.flatMap((page) => page.items) ?? []);
  /** Refreshes all displayed projections without resubmitting a mutation, reporting their failures once. */
  async function refresh() {
    if (
      editing.activity.isPending ||
      editing.request.isPending ||
      query.isFetching ||
      results.isFetching ||
      seasonFetching
    )
      return;
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
    )
      feedback.error();
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
      refreshing ||
      query.isFetching ||
      editing.activity.isPending ||
      editing.request.isPending
    )
      return;
    feedback.clear();
    await results.fetchNextPage({ cancelRefetch: false });
  }
  const header = (
    <View style={[!rows.length && pageContentStyle, styles.section]}>
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
          seasonFetching={seasonFetching}
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
  const FeedbackLayout = (
    !authority.enabled
      ? authority.sessionStatus === "restoring" ||
        (authority.sessionStatus === "authenticated" &&
          authority.account.isLoading)
      : !current && query.isLoading
  )
    ? PageContent
    : ScreenState;
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
            ) : query.isError ? (
              <ErrorState
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            ) : current ? (
              <ErrorState />
            ) : (
              <ReadFeedback
                query={query}
                loadingContent={<CollectionControlLoading />}
              />
            )}
          </FeedbackLayout>
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
                refreshing={refreshing}
                onRefresh={() => void refresh()}
              />
            ) : undefined
          }
          data={rows}
          keyExtractor={(row) => `${row.scopeId}/${row.stage}/${row.phase}`}
          contentContainerStyle={
            rows.length ? pageContentStyle : styles.emptyList
          }
          ListHeaderComponent={header}
          ItemSeparatorComponent={ListSeparator}
          onEndReached={() => {
            if (!query.isError && !results.isError) loadMore();
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <CollectionResult result={item} diagnostics={diagnostics} />
          )}
          ListEmptyComponent={
            results.isLoading && !isAccessDenied(results.error) ? (
              <PageContent>
                <CollectionResultsLoading />
              </PageContent>
            ) : (
              <ScreenState>
                {results.isError || results.isPending ? (
                  <ErrorState
                    onRetry={() =>
                      void results.refetch({ cancelRefetch: false })
                    }
                    retrying={results.isFetching}
                  />
                ) : (
                  <EmptyState title="Aucun résultat observé">
                    <Button
                      label="Actualiser"
                      leadingIcon={RefreshCw}
                      onPress={() =>
                        void results.refetch({ cancelRefetch: false })
                      }
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
            )
          }
          ListFooterComponent={
            <>
              {!isAccessDenied(results.error) && results.hasNextPage ? (
                <View style={styles.footer}>
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
                </View>
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
  footer: { gap: tokens.spacing.lg, paddingTop: tokens.spacing.lg },
});
