import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useTheme } from "../../../shared/theme/theme-provider";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { useSearchVisit } from "../forms/search-visit";
import {
  reconcileSearchFilters,
  type SearchFilters,
} from "../model/search-filters";
import { Page, PageContent } from "../../../shared/components/page";
import { Tabs } from "../../../shared/components/tabs";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ScreenState } from "../../../shared/components/screen-state";

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
import { Button } from "../../../shared/components/button";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { SearchField } from "../../../shared/components/search-field";

import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "../api/discovery-context";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import { SearchResults } from "../components/search-results";
import { SearchLoading } from "../components/search-loading";

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
  /** Clearing resets the editable query and validation without altering the selected resource tab. */
  function clearSearch() {
    reset(searchValues());
  }
  /** The results heading clears this resource's criteria; the input clear action retains sporting filters. */
  function clearCriteria() {
    clearSearch();
    if (sporting?.query.data)
      sporting.apply(reconcileSearchFilters(undefined, sporting.query.data));
  }
  return (
    <Page>
      <View style={styles.controls}>
        <View>
          <Tabs
            items={[
              { id: "team", label: "Équipes" },
              { id: "pool", label: "Poules" },
              { id: "club", label: "Clubs" },
            ]}
            selected={resource}
            onSelect={(id) => {
              if (id === "team" || id === "pool" || id === "club")
                setResource(id);
            }}
          />
        </View>
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
      {valid &&
        textual &&
        (sporting && !sporting.filters ? (
          <ReadFeedback
            query={{
              ...sporting.query,
              isPending: sporting.query.isPending || sporting.query.isFetching,
            }}
          />
        ) : (
          <TextSearchResults
            key={hashKey(
              createDiscoveryContext(resource, { q: text, ...filters })
                .queryKey,
            )}
            resource={resource}
            text={text}
            filters={filters}
            onClear={clearCriteria}
          />
        ))}
    </Page>
  );
}

/** Each internal tab mounts its own Query observer; tab return honors native no-refetch/no-retry-on-mount. */
function TextSearchResults({
  resource,
  text,
  filters,
  onClear,
}: {
  resource: DiscoveryResource;
  text: string;
  filters?: SearchFilters;
  onClear: () => void;
}) {
  const query = useDiscoveryQuery(resource, { q: text, ...filters });
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
      pages={query.data?.pages}
      onClear={onClear}
      emptyComponent={
        query.isPending ? (
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
        query.hasNextPage ? (
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
  // Result content owns the following gap in loaded, pending, empty and error states.
  controls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
});
