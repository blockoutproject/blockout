import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchSchema, type SearchValues } from "../schemas/search-schema";
import { searchValues } from "../forms/search-values";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SearchField } from "../../../shared/components/search-field";
import { ResourceTabs } from "../../sporting/components/resource-page";
import type { DiscoveryResource } from "../api/discovery-context";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import {
  SearchResults,
  SearchResultsHeading,
} from "../components/search-results";
import { SearchLoading } from "../components/search-loading";

/**
 * Public text-search entry with internal tabs and a single shared editable value. Empty-text
 * examples, filters and sporting activation remain with their owning tasks.
 * Generated Unicode validation rejects over-limit text without truncating the user's draft.
 */
export function SearchScreen() {
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.controls}>
        <View>
          <ResourceTabs
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
    </SafeAreaView>
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
  const error = query.isError ? (
    <ErrorState
      onRetry={() =>
        void (query.isFetchNextPageError
          ? query.fetchNextPage({ cancelRefetch: false })
          : query.refresh())
      }
      retrying={query.isFetching}
    />
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
        feedback={error}
        refreshing={query.isFetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refresh()}
        continuation={
          query.hasNextPage && !query.isFetchNextPageError ? (
            <Button
              label="Charger la suite"
              variant="secondary"
              disabled={query.isFetching}
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage({ cancelRefetch: false })}
            />
          ) : undefined
        }
      />
    );
  return (
    <ScrollView
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl
          refreshing={query.isFetching}
          onRefresh={() => void query.refresh()}
        />
      }
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <SearchResultsHeading
        count={query.data && !query.isError ? 0 : undefined}
        onClear={onClear}
      />
      {query.isPending ? (
        <SearchLoading />
      ) : (
        <View style={styles.feedback}>
          {error ?? (
            <EmptyState
              title="Aucun résultat pour ces critères"
              description="Essayez un autre nom."
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: { padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  content: {
    flexGrow: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.section,
  },
  feedback: { paddingTop: tokens.spacing.xl },
});
