import type { ReactElement, ReactNode } from "react";
import { Keyboard, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";
import { useSportingNavigation } from "@/features/sporting/navigation";
import { useSearchVisit } from "../forms/search-visit";
import type { DiscoveryResource } from "../api/discovery-context";
import type {
  useDiscoveryQuery,
  useSearchExamplesQuery,
} from "../api/use-discovery-query";
import { uniqueSearchResults } from "../model/search-result";
import { SearchHeading, SearchResults } from "./search-results";
import { ScreenState } from "@/shared/components/screen-state";
import { ListContinuation } from "@/shared/components/list-continuation";
import { EmptyState } from "@/shared/components/state-card";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";

/** One tab's current queries and criteria; the parent retains the shared text, filters and empty-state actions. */
export interface SearchSceneProps {
  resource: DiscoveryResource;
  active: boolean;
  searchable: boolean;
  query: ReturnType<typeof useDiscoveryQuery>;
  exampleQuery: ReturnType<typeof useSearchExamplesQuery>;
  examples: boolean;
  emptyDescription: string;
  emptyAction: ReactNode;
}

/** Keeps accepted pages visible when only their continuation fails. */
export function SearchScene({
  resource,
  active,
  searchable,
  query: textQuery,
  exampleQuery,
  examples,
  emptyDescription,
  emptyAction,
}: Readonly<SearchSceneProps>) {
  const visit = useSearchVisit();
  const query = examples ? exampleQuery : textQuery;
  const items = examples
    ? uniqueSearchResults(exampleQuery.data ? [exampleQuery.data] : undefined)
    : uniqueSearchResults(textQuery.data?.pages);
  const navigation = useNavigation();
  const sportingNavigation = useSportingNavigation(active);
  const sporting = resource === "club" ? undefined : visit[resource];
  const filtersMissing = !!sporting && !sporting.filters;
  const read = filtersMissing ? sporting.query : query;
  const continuationFailed =
    !filtersMissing &&
    !examples &&
    !!textQuery.data &&
    textQuery.isFetchNextPageError;
  const failed = hasReadError(read) && !continuationFailed;
  const resultsReady = (searchable || examples) && !filtersMissing;
  const loading =
    (searchable || examples) &&
    !failed &&
    (filtersMissing || read.isPending) &&
    read.isFetching;

  /** Only the selected focused valid text context may continue its current cursor. */
  function loadMore() {
    if (
      !active ||
      !navigation.isFocused() ||
      !resultsReady ||
      examples ||
      !textQuery.hasNextPage ||
      query.isFetching ||
      failed
    ) {
      return;
    }
    void textQuery.fetchNextPage({ cancelRefetch: false });
  }

  let emptyContent: ReactElement | null = null;
  if (searchable || examples) {
    if (failed) {
      emptyContent = (
        <ScreenState style={styles.listState}>
          <ReadFeedback
            key={filtersMissing ? "options" : "results"}
            query={read}
            loadingContent={null}
            onRetry={
              active ? () => read.refetch({ cancelRefetch: false }) : undefined
            }
          />
        </ScreenState>
      );
    } else if (
      !filtersMissing &&
      !read.isPending &&
      !continuationFailed &&
      !textQuery.isFetchingNextPage
    ) {
      emptyContent = (
        <ScreenState style={styles.listState}>
          <EmptyState
            title={
              examples
                ? "Aucun exemple disponible"
                : "Aucun résultat pour ces critères"
            }
            description={emptyDescription}
          >
            {emptyAction}
          </EmptyState>
        </ScreenState>
      );
    }
  }

  return (
    <SearchResults
      resource={resource}
      active={active}
      onOpen={({ kind, identity }) => {
        Keyboard.dismiss();
        void sportingNavigation.navigate(kind, identity.id);
      }}
      examples={examples}
      items={resultsReady && !failed ? items : []}
      loading={loading}
      heading={
        failed ? undefined : (
          <SearchHeading
            examples={examples}
            count={searchable && textQuery.data ? items.length : undefined}
          />
        )
      }
      onEndReached={() => {
        if (!textQuery.isFetchNextPageError) {
          loadMore();
        }
      }}
      emptyComponent={emptyContent}
      continuation={
        resultsReady && !failed && !examples ? (
          <ListContinuation
            loading={textQuery.isFetchingNextPage}
            failed={continuationFailed}
            disabled={textQuery.isFetching}
            onRetry={loadMore}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  listState: { paddingHorizontal: 0, paddingBottom: 0 },
});
