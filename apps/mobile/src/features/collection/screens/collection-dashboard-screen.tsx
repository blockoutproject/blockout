import { PageFlatList } from "@/shared/components/page-list";
import type { QueryObserverResult } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { CalendarDays, MapPin, RefreshCw, Users } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  CollectionFamilyEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
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
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { AccessFeedback } from "@/features/access/components/access-feedback";
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

/** Reads bounded seasons separately from the independent club destinations. */
export function CollectionDashboardScreen() {
  const { authority, query } = useCollectionSeasons();
  const { colors } = useTheme();
  const router = useRouter();
  const failed = hasReadError(query);

  const FeedbackLayout =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" && authority.account.isLoading)
      ? PageContent
      : ScreenState;
  return (
    <Page header={<PageHeader title="Collectes" />}>
      <PageScrollView
        refreshControl={
          authority.enabled ? (
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
        ) : (
          <PageContent>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Compétitions
            </Text>
            {!failed &&
              query.data?.items.map((season) => (
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
            {!failed && query.data?.items.length === 0 && (
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
  const sessionPending =
    authority.sessionStatus === "restoring" ||
    (authority.sessionStatus === "authenticated" &&
      authority.account.isLoading);
  const pending = !authority.enabled
    ? sessionPending
    : !hasReadError(season) && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  if (!authority.enabled || !season.data || hasReadError(season)) {
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
                query={season}
                loadingContent={<CollectionControlLoading />}
              />
            )}
          </FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <ControlScope
      family={family}
      season={season.data}
      seasonFetching={season.isFetching}
      rereadSeason={() => season.refetch({ cancelRefetch: false })}
    />
  );
}

/** Selection is read from the complete scope list, never inferred from a provider code or another season. */
function ControlScope({
  family,
  season,
  seasonFetching = false,
  rereadSeason,
}: Readonly<{
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonFetching?: boolean;
  rereadSeason?: () => Promise<
    QueryObserverResult<CollectionSeasonResponse | null>
  >;
}>) {
  const { authority, query } = useCollectionControls(season?.id);
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
      season={season}
      seasonFetching={seasonFetching}
      rereadSeason={rereadSeason}
    />
  );
}

/** Results own their read recovery; continuation preserves received evidence and commands remain independent. */
function ControlDashboard({
  controlId,
  family,
  season,
  seasonFetching,
  rereadSeason,
}: Readonly<{
  controlId: string;
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonFetching: boolean;
  rereadSeason?: () => Promise<
    QueryObserverResult<CollectionSeasonResponse | null>
  >;
}>) {
  const editing = useCollectionControl(controlId, season?.id);
  const { authority, query, results } = editing;
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
    !hasReadError(query) &&
    current?.family === family &&
    current.seasonId === season?.id;
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
              .map((row) => [`${row.scopeId}/${row.stage}/${row.phase}`, row]),
          ).values(),
        ];

  /** Refreshes displayed projections independently of collection commands. */
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
    await Promise.all([
      query.refetch({ cancelRefetch: false }),
      results.refetch({ cancelRefetch: false }),
      rereadSeason?.(),
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
      results.isFetching ||
      (results.isError && !results.isFetchNextPageError) ||
      refreshing ||
      query.isFetching ||
      editing.activity.isPending ||
      editing.request.isPending
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
            disabled={
              editing.activity.isPending ||
              editing.request.isPending ||
              query.isFetching ||
              seasonFetching
            }
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
                fetching={refreshing}
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
              {!resultsFailed &&
              !isAccessDenied(results.error) &&
              results.hasNextPage ? (
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
