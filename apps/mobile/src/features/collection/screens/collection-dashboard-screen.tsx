import { useRouter } from "expo-router";
import { CalendarDays, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  CollectionFamilyEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import {
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
  PreparationHeader,
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
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <PreparationPage title="Collectes">
      <CollectionAccessFeedback authority={authority} />
      {authority.enabled && (
        <>
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
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              Aucune saison découverte
            </Text>
          )}
          {query.isError ? (
            <RequestError message="Les saisons sont indisponibles." />
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
          <Button
            label="Actualiser"
            variant="secondary"
            disabled={query.isFetching}
            loading={query.isFetching}
            onPress={() => void query.refetch()}
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
  if (!authority.enabled || !season.data)
    return (
      <PreparationPage title={familyLabels[family]}>
        <CollectionAccessFeedback authority={authority} />
        {authority.enabled &&
          (season.isError ? (
            <RequestError
              message="La saison est indisponible."
              onRetry={() => void season.refetch()}
              retrying={season.isFetching}
            />
          ) : (
            <RequestLoading />
          ))}
      </PreparationPage>
    );
  return (
    <ControlScope
      family={family}
      season={season.data}
      seasonUnavailable={season.isError || season.isFetching}
      rereadSeason={async () => {
        const read = await season.refetch();
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
  rereadSeason,
}: {
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable?: boolean;
  rereadSeason?: () => Promise<boolean>;
}) {
  const { authority, query } = useCollectionControls(season?.id);
  const selected = query.data?.items.find(
    (control) => control.family === family && control.seasonId === season?.id,
  );
  if (!authority.enabled || !selected)
    return (
      <PreparationPage title={familyLabels[family]}>
        <CollectionAccessFeedback authority={authority} />
        {authority.enabled &&
          (query.isError ? (
            <RequestError
              message="Les contrôles sont indisponibles."
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : query.data ? (
            <RequestError message="Ce contrôle est indisponible pour le périmètre sélectionné." />
          ) : (
            <RequestLoading />
          ))}
      </PreparationPage>
    );
  return (
    <ControlDashboard
      key={`${authority.session.generation}/${selected.id}`}
      controlId={selected.id}
      family={family}
      season={season}
      seasonUnavailable={seasonUnavailable}
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
  rereadSeason,
}: {
  controlId: string;
  family: CollectionFamilyEnum;
  season?: CollectionSeasonResponse;
  seasonUnavailable: boolean;
  rereadSeason?: () => Promise<boolean>;
}) {
  const editing = useCollectionControl(controlId, season?.id);
  const { authority, query, results } = editing;
  const { colors } = useTheme();
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const current = query.data;
  const matches = current?.family === family && current.seasonId === season?.id;
  const rows = results.data?.pages.flatMap((page) => page.items) ?? [];
  /** Refresh reads each projection only; command reconciliation is released by its separate explicit reread action. */
  async function refresh() {
    setRefreshing(true);
    await Promise.all([query.refetch(), results.refetch(), rereadSeason?.()]);
    setRefreshing(false);
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
              stateUnavailable={seasonUnavailable}
            />
          ) : query.isError ? (
            <RequestError message="Le contrôle est indisponible." />
          ) : current ? (
            <RequestError message="Le contrôle ne correspond pas au périmètre sélectionné." />
          ) : (
            <RequestLoading />
          )}
          {query.isError && current && (
            <RequestError message="L’actualisation a échoué. Le dernier état lu est conservé." />
          )}
          <Button
            label="Actualiser"
            variant="secondary"
            disabled={refreshing || editing.saving}
            loading={refreshing}
            onPress={() => void refresh()}
          />
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
      <PreparationHeader title={familyLabels[family]} />
      <FlatList
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
              {results.isError && (
                <RequestError
                  message="Les résultats sont indisponibles. Les observations déjà lues sont conservées."
                  onRetry={() => {
                    if (results.isFetchNextPageError)
                      void results.fetchNextPage();
                    else void results.refetch();
                  }}
                  retrying={results.isFetching}
                />
              )}
              {results.isPending && <RequestLoading />}
              {results.data && rows.length === 0 && (
                <Text style={[tokens.typography.body, { color: colors.text }]}>
                  Aucun résultat observé. Aucun succès ne peut être confirmé.
                </Text>
              )}
              {results.hasNextPage && !results.isFetchNextPageError && (
                <Button
                  label="Charger la suite"
                  variant="secondary"
                  disabled={results.isFetching}
                  loading={results.isFetchingNextPage}
                  onPress={() => void results.fetchNextPage()}
                />
              )}
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
  footer: { gap: tokens.spacing.lg, paddingTop: tokens.spacing.lg },
  separator: { height: tokens.spacing.lg },
});
