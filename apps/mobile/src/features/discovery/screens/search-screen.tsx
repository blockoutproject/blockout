import { hashKey } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { supportHref } from "../../support";
import { Image } from "expo-image";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { useSearchVisit } from "../forms/search-visit";
import { reconcileSearchFilters } from "../model/search-filters";
import { Page, PageContent } from "../../../shared/components/page";
import { PagedTabs, PagerTabBar } from "../../../shared/components/paged-tabs";
import { ScreenState } from "../../../shared/components/screen-state";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { useActionFeedback } from "../../../shared/components/action-feedback";

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
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { SearchField } from "../../../shared/components/search-field";

import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "../api/discovery-context";
import {
  useDiscoveryQuery,
  useSearchExamplesQuery,
} from "../api/use-discovery-query";
import { SearchHeading, SearchResults } from "../components/search-results";
import { SearchLoading } from "../components/search-loading";
import {
  useCollapsingTabsContext,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import { uniqueSearchResults, type SearchResult } from "../model/search-result";

const searchTabs = [
  { id: "team", label: "Équipes" },
  { id: "pool", label: "Poules" },
  { id: "club", label: "Clubs" },
] as const;

/**
 * Public discovery with shared text and retained examples per tab/filter visit context.
 * Filters retain one selection per sporting tab; empty/whitespace reads explicitly present examples.
 * Native end events continue the selected focused context. Initial errors use the shared card;
 * failed continuation reports a toast, retains accepted pages and offers retry at the list edge.
 * Owner-authorized reread failures retain usable rows with explicit retry; an old empty response
 * cannot establish current absence. There is no refresh gesture or automatic replay.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 * The existing F10 route receives only Search provenance; RHF text and visit criteria stay local.
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
  const examples = text.replace(/\p{White_Space}/gu, "") === "";
  const teamExamples = useSearchExamplesQuery(
    "team",
    { ...visit.team.filters },
    resource === "team" && examples && !!visit.team.filters,
  );
  const poolExamples = useSearchExamplesQuery(
    "pool",
    { ...visit.pool.filters },
    resource === "pool" && examples && !!visit.pool.filters,
  );
  const clubExamples = useSearchExamplesQuery(
    "club",
    {},
    resource === "club" && examples,
  );
  const exampleQueries = {
    team: teamExamples,
    pool: poolExamples,
    club: clubExamples,
  };
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
              active={resource === id}
              searchable={searchable}
              query={queries[id]}
              exampleQuery={exampleQueries[id]}
              examples={examples}
              items={items[id]}
            />
          ),
        }))}
        renderTabBar={(props) => (
          <>
            <View style={styles.navigation}>
              <View style={styles.tabs}>
                <PagerTabBar {...props} />
              </View>
              <IconButton
                label="Signaler un problème"
                onPress={() => {
                  Keyboard.dismiss();
                  router.push(supportHref({ screen: "search" }));
                }}
              >
                <Flag
                  accessible={false}
                  size={tokens.size.icon.lg}
                  color={colors.icon}
                />
              </IconButton>
            </View>
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
              {(searchable || examples) && (!sporting || filters) && (
                <SearchHeading
                  examples={examples}
                  count={
                    queries[resource].data ? items[resource].length : undefined
                  }
                  onClear={
                    examples && !changed
                      ? undefined
                      : () => clearCriteria(resource)
                  }
                />
              )}
            </View>
          </>
        )}
      />
    </Page>
  );
}

/** Retains accepted cards and retries the failed Query operation without introducing another read owner. */
function SearchScene({
  resource,
  active,
  searchable,
  query: textQuery,
  exampleQuery,
  examples,
  items: textItems,
}: {
  resource: DiscoveryResource;
  active: boolean;
  searchable: boolean;
  query: ReturnType<typeof useDiscoveryQuery>;
  exampleQuery: ReturnType<typeof useSearchExamplesQuery>;
  examples: boolean;
  items: readonly SearchResult[];
}) {
  const visit = useSearchVisit();
  const query = examples ? exampleQuery : textQuery;
  const items = examples
    ? uniqueSearchResults(exampleQuery.data ? [exampleQuery.data] : undefined)
    : textItems;
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const { focusedTab } = useCollapsingTabsContext();
  const sporting = resource === "club" ? undefined : visit[resource];
  const filters = sporting?.filters;
  const resultsReady = (searchable || examples) && (!sporting || !!filters);
  /** The visible valid context owns continuation; explicit retry may resume its failed cursor. */
  async function loadMore() {
    if (
      !active ||
      !navigation.isFocused() ||
      !resultsReady ||
      examples ||
      !textQuery.hasNextPage ||
      query.isFetching
    )
      return;
    feedback.clear();
    const result = await textQuery.fetchNextPage({ cancelRefetch: false });
    if (
      result.isFetchNextPageError &&
      result.data &&
      navigation.isFocused() &&
      focusedTab.value === resource
    )
      feedback.error();
  }
  // Refusals can empty an unfinished textual traversal; only an explicit continuation may resume it.
  const continueEmpty =
    !examples &&
    items.length === 0 &&
    textQuery.hasNextPage &&
    (!query.isError || textQuery.isFetchNextPageError);
  const error =
    (query.isError || continueEmpty) && items.length === 0 ? (
      <ErrorState
        onRetry={continueEmpty ? loadMore : () => void query.refetch()}
        retrying={query.isFetching}
      />
    ) : undefined;
  return (
    <SearchResults
      examples={examples}
      items={resultsReady ? items : []}
      onEndReached={() => {
        if (!query.isError) loadMore();
      }}
      emptyComponent={
        !searchable && !examples ? null : sporting && !filters ? (
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
        resultsReady &&
        query.data &&
        ((!examples && textQuery.isFetchingNextPage) || query.isError) ? (
          <ListContinuation
            loading={query.isFetching}
            failed={query.isError}
            disabled={!active || query.isFetching}
            onRetry={
              !examples && textQuery.isFetchNextPageError
                ? loadMore
                : () => void query.refetch()
            }
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  // Product Design 916:2892: the shared reporting action sits beside the resource tabs.
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingRight: tokens.spacing.screen,
  },
  tabs: { flex: 1, minWidth: 0 },
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
  // One search composition owns equal spacing from tabs to input and from input to its heading.
  controls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
});
