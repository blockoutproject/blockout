import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { useRouter } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CollectionFamilyEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
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
import {
  CollectionAccessFeedback,
  PreparationLink,
  PreparationPage,
  SeasonIdentity,
  preparationStyles,
  seasonStatus,
} from "../components/preparation-layout";

/** Navigation labels correspond to F01's four independent control families. */
const familyLabels: Record<CollectionFamilyEnum, string> = {
  ffvb: "FFVB",
  lnv: "LNV",
  "club-sheets": "Fiches clubs",
  geocoding: "Géocodage",
};

/** Lists competition seasons and independent club destinations; entering or refreshing performs only reads. */
export function CollectionDashboardScreen() {
  const { authority, query } = useCollectionSeasons();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <PreparationPage
      title="Collectes"
      state={
        !authority.enabled ? (
          <CollectionAccessFeedback authority={authority} />
        ) : undefined
      }
      refreshing={query.isRefetching || authority.account.isRefetching}
      onRefresh={
        authority.sessionStatus === "authenticated"
          ? () => {
              if (authority.enabled)
                void query.refetch({ cancelRefetch: false }).then((result) => {
                  if (
                    result.isError &&
                    result.data &&
                    !isAccessDenied(result.error)
                  )
                    feedback.error();
                });
              else
                void authority.account
                  .refetch({ cancelRefetch: false })
                  .then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  });
            }
          : undefined
      }
    >
      <CollectionAccessFeedback authority={authority} />
      {authority.enabled && (
        <>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading, { color: colors.text }]}
          >
            Compétitions
          </Text>
          {(!isAccessDenied(query.error) ? query.data?.items : undefined)?.map(
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
          {!isAccessDenied(query.error) && query.data?.items.length === 0 && (
            <EmptyState title="Aucune saison découverte" />
          )}
          {isAccessDenied(query.error) ? (
            <AccessDenied message="Les saisons ne sont pas accessibles." />
          ) : query.isError && !query.data ? (
            <RequestError
              message="Les saisons sont indisponibles."
              onRetry={() =>
                void query.refetch({ cancelRefetch: false }).then((result) => {
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
          ) : (
            !query.data && <RequestLoading />
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
    </PreparationPage>
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
      <PreparationPage
        title={familyLabels[family]}
        state={
          !authority.enabled ? (
            <CollectionAccessFeedback authority={authority} />
          ) : isAccessDenied(season.error) ? (
            <AccessDenied />
          ) : season.isError ? (
            <RequestError
              message="La saison est indisponible."
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
          )
        }
        refreshing={season.isRefetching || authority.account.isRefetching}
        onRefresh={
          authority.sessionStatus === "authenticated"
            ? () => {
                if (authority.enabled)
                  void season
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (
                        result.isError &&
                        result.data &&
                        !isAccessDenied(result.error)
                      )
                        feedback.error();
                    });
                else
                  void authority.account
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (
                        result.isError &&
                        result.data &&
                        !isAccessDenied(result.error)
                      )
                        feedback.error();
                    });
              }
            : undefined
        }
      />
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
      <PreparationPage
        title={familyLabels[family]}
        state={
          !authority.enabled ? (
            <CollectionAccessFeedback authority={authority} />
          ) : isAccessDenied(query.error) ? (
            <AccessDenied message="Ces contrôles ne sont pas accessibles." />
          ) : query.isError ? (
            <RequestError
              message="Les contrôles sont indisponibles."
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
            <RequestError message="Ce contrôle est indisponible pour le périmètre sélectionné." />
          ) : (
            <RequestLoading />
          )
        }
        refreshing={query.isRefetching || authority.account.isRefetching}
        onRefresh={
          authority.sessionStatus === "authenticated"
            ? () => {
                if (authority.enabled)
                  void query
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (
                        result.isError &&
                        result.data &&
                        !isAccessDenied(result.error)
                      )
                        feedback.error();
                    });
                else
                  void authority.account
                    .refetch({ cancelRefetch: false })
                    .then((result) => {
                      if (
                        result.isError &&
                        result.data &&
                        !isAccessDenied(result.error)
                      )
                        feedback.error();
                    });
              }
            : undefined
        }
      />
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

/** Virtualized current evidence remains readable after failed refresh; no execution-history or source-editing surface. */
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
  const rows = isAccessDenied(results.error)
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
    if (!authority.enabled) {
      await authority.account.refetch({ cancelRefetch: false });
      return;
    }
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
  const header = (
    <View style={styles.section}>
      <CollectionAccessFeedback authority={authority} />
      {authority.enabled && (
        <>
          {season && <SeasonIdentity season={season} />}
          {season?.state === "closed" && (
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              Saison clôturée · historique conservé
            </Text>
          )}
          {seasonUnavailable && (
            <RequestError message="L’état de la saison doit être relu avant une nouvelle action." />
          )}
          {matches && current ? (
            <CollectionControl
              control={current}
              editing={editing}
              season={season}
              rereadSeason={rereadSeason}
              seasonFetching={seasonFetching}
              stateUnavailable={seasonUnavailable}
            />
          ) : query.isError ? (
            <RequestError
              message="Le contrôle est indisponible."
              onRetry={() =>
                void query.refetch({ cancelRefetch: false }).then((result) => {
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
          ) : current ? (
            <RequestError message="Le contrôle ne correspond pas au périmètre sélectionné." />
          ) : (
            <RequestLoading />
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
              diagnostics
                ? "Masquer les diagnostics"
                : "Afficher les diagnostics"
            }
            variant="secondary"
            onPress={() => setDiagnostics(!diagnostics)}
          />
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title={familyLabels[family]} />
      {!authority.enabled || !matches ? (
        <ScrollView
          contentContainerStyle={styles.state}
          alwaysBounceVertical
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
              />
            ) : undefined
          }
        >
          <ScreenState>
            {!authority.enabled ? (
              <CollectionAccessFeedback authority={authority} />
            ) : isAccessDenied(query.error) ? (
              <AccessDenied />
            ) : query.isError ? (
              <RequestError
                message="Le contrôle est indisponible."
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            ) : current ? (
              <RequestError message="Le contrôle ne correspond pas au périmètre sélectionné." />
            ) : (
              <RequestLoading />
            )}
          </ScreenState>
        </ScrollView>
      ) : (
        <FlatList
          alwaysBounceVertical
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                enabled={
                  !editing.activity.pending && !results.isFetchingNextPage
                }
                refreshing={refreshing}
                onRefresh={() => void refresh()}
              />
            ) : undefined
          }
          data={authority.enabled && matches ? rows : []}
          keyExtractor={(row) => `${row.scopeId}/${row.stage}/${row.phase}`}
          contentContainerStyle={preparationStyles.content}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <CollectionResult result={item} diagnostics={diagnostics} />
          )}
          ListFooterComponent={
            authority.enabled && matches ? (
              <View style={styles.footer}>
                {isAccessDenied(results.error) ? (
                  <AccessDenied message="Ces résultats ne sont pas accessibles." />
                ) : (
                  results.isError &&
                  !results.data && (
                    <RequestError
                      message="Les résultats sont indisponibles."
                      onRetry={() =>
                        void results.refetch().then((result) => {
                          if (
                            result.isError &&
                            result.data &&
                            !isAccessDenied(result.error)
                          )
                            feedback.error();
                        })
                      }
                      retrying={results.isFetching}
                    />
                  )
                )}
                {results.isPending && <RequestLoading />}
                {!isAccessDenied(results.error) &&
                  results.data &&
                  rows.length === 0 && (
                    <EmptyState
                      title="Aucun résultat observé"
                      description="Aucun succès ne peut être confirmé."
                    />
                  )}
                {!isAccessDenied(results.error) && results.hasNextPage && (
                  <Button
                    label={
                      results.isFetchNextPageError
                        ? "Réessayer"
                        : "Charger la suite"
                    }
                    variant="secondary"
                    disabled={results.isFetching}
                    loading={results.isFetchingNextPage}
                    onPress={() =>
                      void results.fetchNextPage().then((result) => {
                        if (result.isError && !isAccessDenied(result.error))
                          feedback.error();
                      })
                    }
                  />
                )}
              </View>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: { flexGrow: 1, padding: tokens.spacing.lg },
  section: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
  footer: { gap: tokens.spacing.lg, paddingTop: tokens.spacing.lg },
  separator: { height: tokens.spacing.lg },
});
