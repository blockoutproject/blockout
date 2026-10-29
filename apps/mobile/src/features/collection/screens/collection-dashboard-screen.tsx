import { ListSeparator } from "../../../shared/components/list-separator";
import { SeasonIdentity, seasonStatus } from "../components/source-summary";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "../../access/components/access-feedback";
import {
  Page,
  PageScrollView,
  pageContentStyle,
  PageContent,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { useNavigation, useRouter } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type {
  CollectionFamilyEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  useCollectionControls,
  useCollectionControl,
} from "../api/use-collection-controls";
import {
  useCollectionSeason,
  useCollectionSeasons,
} from "../api/use-source-preparation";
import { CollectionControl } from "../components/collection-control";
import { CollectionResult } from "../components/collection-result";
import { CollectionLoading } from "../components/collection-loading";

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
  /** Native refresh retains authorized data after a technical failure; an initial read still owns its error card. */
  async function refresh() {
    const result = await query.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  const blockingState = !authority.enabled ? (
    <AccessFeedback {...authority} />
  ) : undefined;
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Collectes" />}>
        {({ onScroll, headerHeight }) => (
          <PageScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              authority.enabled ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  refreshing={
                    query.isRefetching || authority.account.isRefetching
                  }
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {blockingState ? (
              <ScreenState>{blockingState}</ScreenState>
            ) : (
              <PageContent>
                {authority.enabled && (
                  <>
                    <Text
                      accessibilityRole="header"
                      style={[
                        tokens.typography.heading,
                        { color: colors.text },
                      ]}
                    >
                      Compétitions
                    </Text>
                    {(!denied ? query.data?.items : undefined)?.map(
                      (season) => (
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
                      ),
                    )}
                    {!denied && query.data?.items.length === 0 && (
                      <EmptyState title="Aucune saison découverte" />
                    )}
                    {denied || (query.isError && !query.data) ? (
                      <ErrorState
                        onRetry={() => void refresh()}
                        retrying={query.isFetching}
                      />
                    ) : (
                      !query.data && <CollectionLoading />
                    )}
                    <Text
                      accessibilityRole="header"
                      style={[
                        tokens.typography.heading,
                        { color: colors.text },
                      ]}
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
        )}
      </ScrollChrome>
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
  if (!authority.enabled || !season.data || isAccessDenied(season.error))
    return (
      <Page edges={["left", "right", "bottom"]}>
        <ScrollChrome header={<PageHeader title={familyLabels[family]} />}>
          {({ onScroll, headerHeight }) => (
            <PageScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              contentContainerStyle={{ paddingTop: headerHeight }}
            >
              <ScreenState>
                {!authority.enabled ? (
                  <AccessFeedback {...authority} />
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
                  <RequestLoading />
                )}
              </ScreenState>
            </PageScrollView>
          )}
        </ScrollChrome>
      </Page>
    );
  return (
    <ControlScope
      family={family}
      season={season.data}
      seasonUnavailable={season.isError || season.isFetching}
      seasonFetching={season.isFetching}
      rereadSeason={async () => {
        const read = await season.refetch({ cancelRefetch: false });
        if (read.isError && read.data && !isAccessDenied(read.error))
          feedback.error();
        return !read.isError && !!read.data;
      }}
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
  rereadSeason?: () => Promise<boolean>;
}) {
  const { authority, query } = useCollectionControls(season?.id);
  const feedback = useActionFeedback();
  const selected =
    !isAccessDenied(query.error) &&
    query.data?.items.find(
      (control) => control.family === family && control.seasonId === season?.id,
    );
  if (!authority.enabled || !selected)
    return (
      <Page edges={["left", "right", "bottom"]}>
        <ScrollChrome header={<PageHeader title={familyLabels[family]} />}>
          {({ onScroll, headerHeight }) => (
            <PageScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              contentContainerStyle={{ paddingTop: headerHeight }}
            >
              <ScreenState>
                {!authority.enabled ? (
                  <AccessFeedback {...authority} />
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
                  <RequestLoading />
                )}
              </ScreenState>
            </PageScrollView>
          )}
        </ScrollChrome>
      </Page>
    );
  return (
    <ControlDashboard
      key={`${authority.session.generation}/${selected.id}`}
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
  rereadSeason?: () => Promise<boolean>;
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
  /** Refresh reads each projection only; command reconciliation is released by its separate explicit reread action. */
  async function refresh() {
    if (
      editing.activity.isPending() ||
      query.isFetching ||
      results.isFetching ||
      seasonFetching
    )
      return;
    const [controlRead, resultRead] = await Promise.all([
      query.refetch({ cancelRefetch: false }),
      results.refetch({ cancelRefetch: false }),
      rereadSeason?.(),
    ]);
    if (
      (controlRead.isError &&
        controlRead.data &&
        !isAccessDenied(controlRead.error)) ||
      (resultRead.isError &&
        resultRead.data &&
        !isAccessDenied(resultRead.error))
    )
      feedback.error();
  }
  /** The shared continuation command preserves scope; automatic edges separately exclude read errors. */
  async function loadMore() {
    if (
      !authority.enabled ||
      !authority.session.isCurrent(authority.session.generation) ||
      !matches ||
      !navigation.isFocused() ||
      !results.hasNextPage ||
      isAccessDenied(query.error) ||
      isAccessDenied(results.error) ||
      results.isFetching ||
      refreshing ||
      query.isFetching ||
      editing.activity.isPending() ||
      editing.request.isPending()
    )
      return;
    feedback.clear();
    const result = await results.fetchNextPage({ cancelRefetch: false });
    if (
      result.isFetchNextPageError &&
      result.data &&
      !isAccessDenied(result.error) &&
      authority.session.isCurrent(authority.session.generation) &&
      navigation.isFocused()
    )
      feedback.error();
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
          rereadSeason={rereadSeason}
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
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title={familyLabels[family]} />}>
        {({ onScroll, headerHeight }) =>
          !authority.enabled || !matches ? (
            <PageScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              contentContainerStyle={{ paddingTop: headerHeight }}
            >
              <ScreenState>
                {!authority.enabled ? (
                  <AccessFeedback {...authority} />
                ) : query.isError ? (
                  <ErrorState
                    onRetry={() => void query.refetch()}
                    retrying={query.isFetching}
                  />
                ) : current ? (
                  <ErrorState />
                ) : (
                  <RequestLoading />
                )}
              </ScreenState>
            </PageScrollView>
          ) : (
            <Animated.FlatList
              testID="collection-results-list"
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              alwaysBounceVertical
              refreshControl={
                authority.sessionStatus === "authenticated" ? (
                  <DataRefreshControl
                    progressViewOffset={headerHeight}
                    enabled={
                      !editing.activity.pending && !results.isFetchingNextPage
                    }
                    refreshing={refreshing}
                    onRefresh={() => void refresh()}
                  />
                ) : undefined
              }
              data={rows}
              keyExtractor={(row) => `${row.scopeId}/${row.stage}/${row.phase}`}
              contentContainerStyle={[
                rows.length ? pageContentStyle : styles.emptyList,
                {
                  paddingTop:
                    headerHeight +
                    (rows.length ? tokens.layout.content.start : 0),
                },
              ]}
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
                <ScreenState>
                  {isAccessDenied(results.error) ||
                  (results.isError && !results.data) ? (
                    <ErrorState
                      onRetry={() =>
                        void results.refetch({ cancelRefetch: false })
                      }
                      retrying={results.isFetching}
                    />
                  ) : results.isPending ? (
                    <RequestLoading />
                  ) : (
                    <EmptyState
                      title="Aucun résultat observé"
                      description="Aucun succès ne peut être confirmé."
                    />
                  )}
                </ScreenState>
              }
              ListFooterComponent={
                !isAccessDenied(results.error) && results.hasNextPage ? (
                  <View style={styles.footer}>
                    <ListContinuation
                      loading={results.isFetchingNextPage}
                      failed={results.isFetchNextPageError}
                      disabled={
                        results.isFetching ||
                        refreshing ||
                        query.isFetching ||
                        editing.activity.pending
                      }
                      onRetry={loadMore}
                    />
                  </View>
                ) : undefined
              }
            />
          )
        }
      </ScrollChrome>
    </Page>
  );
}
const styles = StyleSheet.create({
  emptyList: { flexGrow: 1 },
  section: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
  footer: { gap: tokens.spacing.lg, paddingTop: tokens.spacing.lg },
});
