import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Eraser, Flag, Search } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { supportHref } from "../../support";
import { Image } from "expo-image";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSearchVisit } from "../forms/search-visit";
import { reconcileSearchFilters } from "../model/search-filters";
import { Page } from "../../../shared/components/page";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { Button } from "../../../shared/components/button";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { SearchHeading } from "../components/search-results";
import { SearchScene } from "../components/search-scene";
import { uniqueSearchResults } from "../model/search-result";

const searchTabs = [
  { id: "team", label: "Équipes" },
  { id: "pool", label: "Poules" },
  { id: "club", label: "Clubs" },
] as const;

/**
 * Public discovery with shared text and current examples cached per tab/filter context.
 * Filters retain one selection per sporting tab; empty/whitespace reads explicitly present examples.
 * The fixed heading follows that text intent while initial options and result cards are pending.
 * Native end events continue the selected focused context. Initial errors use the shared card;
 * failed continuation retains accepted pages and offers retry only at the list edge.
 * Owner-authorized reread failures retain usable rows with explicit retry; an old empty response
 * cannot establish current absence. There is no refresh gesture or additional background read trigger.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 * The existing F10 route receives only Search provenance; RHF text and visit criteria stay local.
 * Voluntary card selection uses F03's UUID navigation and the single F11 transition owner.
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
  const { control, reset, setFocus } = useForm<SearchValues>({
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
  const textKey = hashKey(
    createDiscoveryContext("club", { q: queryText }).queryKey,
  );
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
  let emptyDescription = "Essayez un autre nom.";
  if (examples) {
    emptyDescription = changed
      ? "Effacez les critères pour élargir la recherche."
      : "Saisissez un nom pour lancer une recherche.";
  }
  const placeholder = {
    club: "Rechercher un club…",
    team: "Rechercher une équipe…",
    pool: "Rechercher une poule…",
  }[resource];
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
    if (selection?.query.data) {
      selection.apply(reconcileSearchFilters(undefined, selection.query.data));
    }
  }

  return (
    <Page fullBleed>
      <PagedTabs
        selected={resource}
        onSelect={(id) => {
          if (id === "team" || id === "pool" || id === "club") {
            setResource(id);
          }
        }}
        tabs={searchTabs.map(({ id, label }) => ({
          id,
          label,
          resetKey: hashKey([
            textKey,
            id === "club" ? undefined : visit[id].filters,
          ]),
          content: (
            <SearchScene
              resource={id}
              criteria={hashKey([
                textKey,
                id === "club" ? undefined : visit[id].filters,
              ])}
              active={resource === id}
              searchable={searchable}
              query={queries[id]}
              exampleQuery={exampleQueries[id]}
              examples={examples}
              items={items[id]}
              emptyDescription={emptyDescription}
              emptyAction={
                !examples || changed ? (
                  <Button
                    label="Effacer les critères"
                    leadingIcon={Eraser}
                    onPress={() => clearCriteria(id)}
                  />
                ) : (
                  <Button
                    label="Rechercher"
                    leadingIcon={Search}
                    onPress={() => setFocus("q")}
                  />
                )
              }
            />
          ),
        }))}
        renderTabBar={(tabBar) => (
          <>
            <View style={styles.navigation}>
              <View style={styles.tabs}>{tabBar}</View>
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
                        placeholder={placeholder}
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
              <SearchHeading
                examples={examples}
                count={
                  searchable && queries[resource].data
                    ? items[resource].length
                    : undefined
                }
                onClear={
                  examples && !changed
                    ? undefined
                    : () => clearCriteria(resource)
                }
              />
            </View>
          </>
        )}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  // Product Design 916:2892: the shared reporting action sits beside the resource tabs.
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
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
  // SearchHeading owns the same compact row and touch clearance in every state.
  controls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.sm,
  },
});
