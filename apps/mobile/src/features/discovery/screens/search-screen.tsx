import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { Tabs } from "../../../shared/components/tabs";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ScreenState } from "../../../shared/components/screen-state";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { searchSchema, type SearchValues } from "../schemas/search-schema";
import { searchValues } from "../forms/search-values";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { SearchField } from "../../../shared/components/search-field";

import type { DiscoveryResource } from "../api/discovery-context";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import {
  SearchResults,
  SearchResultsHeading,
  searchResultsStartStyle,
} from "../components/search-results";
import { SearchLoading } from "../components/search-loading";

/**
 * Public text-search entry with internal tabs and a single shared editable value. Empty-text
 * examples, filters and sporting activation remain with their owning tasks.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 */
export function SearchScreen() {
  const [resource, setResource] = useState<DiscoveryResource>("team");
  const { control, reset } = useForm<SearchValues>({
    defaultValues: searchValues(),
    resolver: zodResolver(searchSchema),
    mode: "onChange",
  });
  const text = useWatch({ control, name: "q" });
  const valid = searchSchema.safeParse({ q: text }).success;
  const textual = /[^\p{White_Space}]/u.test(text);
  /** Clearing resets the editable query and validation without altering the selected resource tab. */
  function clearSearch() {
    reset(searchValues());
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
      {valid && textual && (
        <TextSearchResults
          key={resource}
          resource={resource}
          text={text}
          onClear={clearSearch}
        />
      )}
    </Page>
  );
}

/** Each internal tab mounts its own Query observer; tab return honors native no-refetch/no-retry-on-mount. */
function TextSearchResults({
  resource,
  text,
  onClear,
}: {
  resource: DiscoveryResource;
  text: string;
  onClear: () => void;
}) {
  const query = useDiscoveryQuery(resource, { q: text });
  const feedback = useActionFeedback();
  /** Reports an explicit failed refresh without replacing retained results or their empty state. */
  async function refresh() {
    try {
      await query.refresh();
    } catch (error) {
      if (
        query.data &&
        !isAccessDenied(error) &&
        !(error instanceof ApiError && error.status === 404)
      )
        feedback.error();
    }
  }
  /** Continuation failure leaves loaded rows and the same continuation action available. */
  async function loadMore() {
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  const error =
    query.isError && !query.data ? (
      <ErrorState onRetry={() => void refresh()} retrying={query.isFetching} />
    ) : undefined;
  if (
    query.data?.pages.some((page) =>
      "clubs" in page
        ? page.clubs.length > 0
        : "teams" in page
          ? page.teams.length > 0
          : page.pools.length > 0,
    )
  )
    return (
      <SearchResults
        pages={query.data.pages}
        onClear={onClear}
        refreshing={query.isRefetching}
        onRefresh={() => void refresh()}
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
  return (
    <PageScrollView
      refreshControl={
        <DataRefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void refresh()}
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      <PageContent style={[styles.heading, searchResultsStartStyle]}>
        <SearchResultsHeading
          count={query.data ? 0 : undefined}
          onClear={onClear}
        />
      </PageContent>
      {query.isPending ? (
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
      )}
    </PageScrollView>
  );
}

const styles = StyleSheet.create({
  // Result content owns the following gap in loaded, pending, empty and error states.
  controls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  heading: { flexGrow: 0 },
});
