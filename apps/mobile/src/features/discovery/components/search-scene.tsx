import type { ReactNode } from "react";
import { Keyboard } from "react-native";
import { useNavigation } from "expo-router";
import { useSportingNavigation } from "../../sporting/navigation";
import { useSearchVisit } from "../forms/search-visit";
import type { DiscoveryResource } from "../api/discovery-context";
import type {
  useDiscoveryQuery,
  useSearchExamplesQuery,
} from "../api/use-discovery-query";
import { uniqueSearchResults, type SearchResult } from "../model/search-result";
import { SearchResults, SearchResultsContent } from "./search-results";
import { SearchLoading } from "./search-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import {
  hasReadError,
  ReadFeedback,
} from "../../../shared/components/read-feedback";

/** One tab's current queries and criteria; the parent retains the shared text, filters and empty-state actions. */
export interface SearchSceneProps {
  resource: DiscoveryResource;
  criteria: string;
  active: boolean;
  searchable: boolean;
  query: ReturnType<typeof useDiscoveryQuery>;
  exampleQuery: ReturnType<typeof useSearchExamplesQuery>;
  examples: boolean;
  items: readonly SearchResult[];
  emptyDescription: string;
  emptyAction: ReactNode;
}

/**
 * Keeps queries and criteria in their existing owners while presenting each tab's content.
 * The text Clubs reference masks failed results and resumes its safe read or failed cursor;
 * the other discovery consumers retain their feature-owned adoption boundary.
 */
export function SearchScene({
  resource,
  criteria,
  active,
  searchable,
  query: textQuery,
  exampleQuery,
  examples,
  items: textItems,
  emptyDescription,
  emptyAction,
}: Readonly<SearchSceneProps>) {
  const visit = useSearchVisit();
  const query = examples ? exampleQuery : textQuery;
  const examplePages = exampleQuery.data ? [exampleQuery.data] : undefined;
  const items = examples ? uniqueSearchResults(examplePages) : textItems;
  const navigation = useNavigation();
  const sportingNavigation = useSportingNavigation(active);
  const sporting = resource === "club" ? undefined : visit[resource];
  const filters = sporting?.filters;
  const resultsReady = (searchable || examples) && (!sporting || !!filters);
  const clubsReference = resource === "club" && !examples;
  const clubsFailed = clubsReference && hasReadError(query);

  /** The visible valid context owns continuation; explicit retry may resume its failed cursor. */
  async function loadMore() {
    if (
      !active ||
      !navigation.isFocused() ||
      !resultsReady ||
      examples ||
      !textQuery.hasNextPage ||
      query.isFetching
    ) {
      return;
    }
    await textQuery.fetchNextPage({ cancelRefetch: false });
  }

  const error = clubsReference ? (
    clubsFailed ? (
      <ReadFeedback
        query={query}
        loadingContent={null}
        onRetry={
          active && searchable
            ? () =>
                textQuery.isFetchNextPageError
                  ? textQuery.fetchNextPage({ cancelRefetch: false })
                  : textQuery.refetch({ cancelRefetch: false })
            : undefined
        }
      />
    ) : undefined
  ) : (
    searchReadError(
      query,
      textQuery,
      examples,
      items.length === 0,
      active,
      loadMore,
    )
  );
  const filtersPending = sporting?.query.isFetching ?? false;
  const loadingNextPage = !examples && textQuery.isFetchingNextPage;
  const initialLoading = (
    <SearchResultsContent>
      <SearchLoading />
    </SearchResultsContent>
  );
  return (
    <SearchResults
      key={criteria}
      onOpen={({ kind, identity }) => {
        Keyboard.dismiss();
        void sportingNavigation.navigate(kind, identity.id);
      }}
      examples={examples}
      items={resultsReady && !clubsFailed ? items : []}
      preserveScrollPosition={clubsReference}
      onEndReached={() => {
        if (!query.isError) {
          loadMore();
        }
      }}
      emptyComponent={
        (searchable || examples) &&
        !(
          clubsReference &&
          query.isPending &&
          !query.isFetching &&
          !clubsFailed
        ) ? (
          <SearchEmptyFeedback
            filtersMissing={!!sporting && !filters}
            filtersPending={filtersPending}
            onRetryFilters={
              sporting?.query.isEnabled
                ? () => void sporting.query.refetch()
                : undefined
            }
            loading={query.isPending && query.isFetching && !clubsFailed}
            initialLoading={initialLoading}
            error={error}
            examples={examples}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : null
      }
      continuation={
        resultsReady &&
        query.data &&
        !clubsFailed &&
        (loadingNextPage || query.isError) ? (
          <ListContinuation
            loading={loadingNextPage}
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

/** An unfinished empty traversal keeps its explicit continuation retry; nonempty results have no initial error. */
function searchReadError(
  query:
    | ReturnType<typeof useDiscoveryQuery>
    | ReturnType<typeof useSearchExamplesQuery>,
  textQuery: ReturnType<typeof useDiscoveryQuery>,
  examples: boolean,
  empty: boolean,
  active: boolean,
  loadMore: () => Promise<void>,
) {
  const continueEmpty =
    !examples &&
    empty &&
    textQuery.hasNextPage &&
    (!query.isError || textQuery.isFetchNextPageError);
  if (!(query.isError || query.isPending || continueEmpty) || !empty) {
    return undefined;
  }
  let onRetry: (() => void) | undefined;
  if (active && query.isEnabled) {
    onRetry = continueEmpty ? loadMore : () => void query.refetch();
  }
  return <ErrorState onRetry={onRetry} retrying={query.isFetching} />;
}

/** Presents the first-read outcome while the scene retains queries, criteria and navigation. */
function SearchEmptyFeedback({
  filtersMissing,
  filtersPending,
  onRetryFilters,
  loading,
  initialLoading,
  error,
  examples,
  description,
  action,
}: Readonly<{
  filtersMissing: boolean;
  filtersPending: boolean;
  onRetryFilters?: () => void;
  loading: boolean;
  initialLoading: ReactNode;
  error: ReactNode;
  examples: boolean;
  description: string;
  action: ReactNode;
}>) {
  if (filtersMissing) {
    return filtersPending ? (
      initialLoading
    ) : (
      <ScreenState>
        <ErrorState onRetry={onRetryFilters} />
      </ScreenState>
    );
  }
  if (loading) {
    return initialLoading;
  }
  return (
    <ScreenState>
      {error ?? (
        <EmptyState
          title={
            examples
              ? "Aucun exemple disponible"
              : "Aucun résultat pour ces critères"
          }
          description={description}
        >
          {action}
        </EmptyState>
      )}
    </ScreenState>
  );
}
