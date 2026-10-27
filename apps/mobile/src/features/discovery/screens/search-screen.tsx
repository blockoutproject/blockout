import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { useSearchVisit } from "../forms/search-visit";
import { reconcileSearchFilters } from "../model/search-filters";
import { Page, PageContent } from "../../../shared/components/page";
import { PagedTabs, PagerTabBar } from "../../../shared/components/paged-tabs";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ScreenState } from "../../../shared/components/screen-state";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { searchSchema, type SearchValues } from "../schemas/search-schema";
import { searchValues } from "../forms/search-values";
import { Button } from "../../../shared/components/button";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { SearchField } from "../../../shared/components/search-field";

import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "../api/discovery-context";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import { SearchHeading, SearchResults } from "../components/search-results";
import { SearchLoading } from "../components/search-loading";
import type { CollapsingTabsRef } from "react-native-collapsible-tab";
import { uniqueSearchResults, type SearchResult } from "../model/search-result";

const searchTabs = [
  { id: "team", label: "Équipes" },
  { id: "pool", label: "Poules" },
  { id: "club", label: "Clubs" },
] as const;

/**
 * Public text-search entry with internal tabs and a single shared editable value. Empty-text
 * examples and sporting activation remain with their owning tasks. Filters retain one selection per sporting tab.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 */
export function SearchScreen() {
  const visit = useSearchVisit();
  const router = useRouter();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const filterSize = Math.max(
    tokens.size.control.default,
    tokens.typography.body.lineHeight * fontScale + tokens.spacing.md * 2,
  );
  const [resource, setResource] = useState<DiscoveryResource>("team");
  const { control, reset } = useForm<SearchValues>({
    defaultValues: searchValues(),
    resolver: zodResolver(searchSchema),
    mode: "onChange",
  });
  const sporting = resource === "club" ? undefined : visit[resource];
  const filters = sporting?.filters;
  const changed =
    !!filters &&
    (filters.seasonId !== sporting?.query.data?.seasons[0]?.id ||
      !!filters.divisionId ||
      !!filters.format ||
      !!filters.gender);
  const text = useWatch({ control, name: "q" });
  const valid = searchSchema.safeParse({ q: text }).success;
  const textual = /[^\p{White_Space}]/u.test(text);
  const searchable = valid && textual;
  // Invalid drafts remain editable; generated request validation receives only a valid inactive input.
  const queryText = searchable ? text : "";
  const pager = useRef<CollapsingTabsRef>(null);
  const textKey = hashKey(
    createDiscoveryContext("club", { q: queryText }).queryKey,
  );
  const teamFilterKey = hashKey([visit.team.filters]);
  const poolFilterKey = hashKey([visit.pool.filters]);
  // Only criteria identities are remembered; RNCT remains the sole owner of native scroll offsets.
  const previousCriteria = useRef({
    textKey,
    team: teamFilterKey,
    pool: poolFilterKey,
  });
  useEffect(() => {
    const previous = previousCriteria.current;
    if (previous.textKey !== textKey) {
      pager.current?.scrollAllToTop();
      previousCriteria.current = {
        textKey,
        team: teamFilterKey,
        pool: poolFilterKey,
      };
    } else if (resource !== "club") {
      const filterKey = resource === "team" ? teamFilterKey : poolFilterKey;
      if (previous[resource] !== filterKey) {
        pager.current?.scrollToTop(false);
        previousCriteria.current = { ...previous, [resource]: filterKey };
      }
    }
  }, [textKey, teamFilterKey, poolFilterKey, resource]);
  const teamQuery = useDiscoveryQuery(
    "team",
    { q: queryText, ...visit.team.filters },
    resource === "team" && searchable && !!visit.team.filters,
  );
  const poolQuery = useDiscoveryQuery(
    "pool",
    { q: queryText, ...visit.pool.filters },
    resource === "pool" && searchable && !!visit.pool.filters,
  );
  const clubQuery = useDiscoveryQuery(
    "club",
    { q: queryText },
    resource === "club" && searchable,
  );
  const queries = { team: teamQuery, pool: poolQuery, club: clubQuery };
  const items = {
    team: uniqueSearchResults(teamQuery.data?.pages),
    pool: uniqueSearchResults(poolQuery.data?.pages),
    club: uniqueSearchResults(clubQuery.data?.pages),
  };
  /** Clearing resets the editable query and validation without altering the selected resource tab. */
  function clearSearch() {
    reset(searchValues());
  }
  /** The results heading clears this resource's criteria; the input clear action retains sporting filters. */
  function clearCriteria(target: DiscoveryResource) {
    clearSearch();
    const selection = target === "club" ? undefined : visit[target];
    if (selection?.query.data)
      selection.apply(reconcileSearchFilters(undefined, selection.query.data));
  }
  return (
    <Page edges={["left", "right", "bottom"]}>
      <PagedTabs
        ref={pager}
        selected={resource}
        onSelect={(id) => {
          if (id === "team" || id === "pool" || id === "club") setResource(id);
        }}
        tabs={searchTabs.map(({ id, label }) => ({
          id,
          label,
          content: (
            <SearchScene
              resource={id}
              searchable={searchable}
              query={queries[id]}
              items={items[id]}
            />
          ),
        }))}
        renderTabBar={(props) => (
          <>
            <PagerTabBar {...props} />
            <View style={styles.controls}>
              <View style={styles.toolbar}>
                <View style={styles.search}>
                  <Controller
                    control={control}
                    name="q"
                    render={({ field, fieldState }) => (
                      <SearchField
                        ref={field.ref}
                        label="Rechercher"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        onClear={clearSearch}
                        placeholder={
                          resource === "club"
                            ? "Rechercher un club…"
                            : resource === "team"
                              ? "Rechercher une équipe…"
                              : "Rechercher une poule…"
                        }
                        error={
                          fieldState.invalid
                            ? "La recherche est limitée à 200 caractères."
                            : undefined
                        }
                        returnKeyType="search"
                        autoCorrect={false}
                      />
                    )}
                  />
                </View>
                {resource !== "club" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={changed ? "Filtres actifs" : "Filtres"}
                    onPress={() => {
                      Keyboard.dismiss();
                      visit.setEditing(resource);
                      visit.draft.reset(visit[resource].filters ?? {});
                      void visit[resource].query.refetch();
                      router.push("/search/filters");
                    }}
                    style={({ pressed }) => [
                      styles.filter,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        width: filterSize,
                        minHeight: filterSize,
                        opacity: pressed ? tokens.opacity.pressed : 1,
                      },
                    ]}
                  >
                    <Image
                      accessible={false}
                      source={require("../../../../assets/discovery/filter.svg")}
                      tintColor={colors.icon}
                      contentFit="contain"
                      style={styles.filterIcon}
                    />
                    {changed && (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.indicator,
                          {
                            backgroundColor: colors.accentPrimary,
                            borderColor: colors.surface,
                          },
                        ]}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
            {searchable && (!sporting || filters) && (
              <View style={styles.resultsHeading}>
                <SearchHeading
                  count={
                    queries[resource].data ? items[resource].length : undefined
                  }
                  onClear={() => clearCriteria(resource)}
                />
              </View>
            )}
          </>
        )}
      />
    </Page>
  );
}

/** Every scene keeps one native list through criteria changes; its query and loaded count share one parent owner. */
function SearchScene({
  resource,
  searchable,
  query,
  items,
}: {
  resource: DiscoveryResource;
  searchable: boolean;
  query: ReturnType<typeof useDiscoveryQuery>;
  items: readonly SearchResult[];
}) {
  const visit = useSearchVisit();
  const sporting = resource === "club" ? undefined : visit[resource];
  const filters = sporting?.filters;
  const resultsReady = searchable && (!sporting || !!filters);
  const feedback = useActionFeedback();
  /** Continuation failure leaves loaded rows and the same continuation action available. */
  async function loadMore() {
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  const error =
    query.isError && !query.data ? (
      <ErrorState
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    ) : undefined;
  return (
    <SearchResults
      items={resultsReady ? items : []}
      emptyComponent={
        !searchable ? null : sporting && !filters ? (
          <ScreenState>
            <ReadFeedback
              query={{
                ...sporting.query,
                isPending:
                  sporting.query.isPending || sporting.query.isFetching,
              }}
            />
          </ScreenState>
        ) : query.isPending ? (
          <PageContent>
            <SearchLoading />
          </PageContent>
        ) : (
          <ScreenState>
            {error ?? (
              <EmptyState
                title="Aucun résultat pour ces critères"
                description="Essayez un autre nom."
              />
            )}
          </ScreenState>
        )
      }
      continuation={
        resultsReady && query.hasNextPage ? (
          <Button
            label={
              query.isFetchNextPageError ? "Réessayer" : "Charger la suite"
            }
            variant="secondary"
            disabled={query.isFetching}
            loading={query.isFetchingNextPage}
            onPress={() => void loadMore()}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  // Figma 7130:19183: the heading is fixed within the continuous blurred chrome, four points below the input.
  resultsHeading: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.xs,
  },
  toolbar: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    alignItems: "flex-start",
  },
  search: { flex: 1, minWidth: 0 },
  filterIcon: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  // Product Design 4346:7264 and prototype discovery.css:103: 7-point dot with a 2-point surface ring.
  indicator: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: tokens.radius.full,
    borderWidth: tokens.spacing.optical,
  },
  filter: {
    width: tokens.size.control.default,
    minHeight: tokens.size.control.default,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  // The fixed heading owns the following gap when a textual search is present.
  controls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
});
