import type { ReactElement, ReactNode } from "react";
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
import { SearchResults } from "./search-results";
import { PageContent } from "../../../shared/components/page";
import { SearchLoading } from "./search-loading";
import { ScreenState } from "../../../shared/components/screen-state";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { EmptyState } from "../../../shared/components/state-card";
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

/** Masks a failed tab while Query retains its pages/cursor and the visit retains its criteria. */
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
  const items = examples
    ? uniqueSearchResults(exampleQuery.data ? [exampleQuery.data] : undefined)
    : textItems;
  const navigation = useNavigation();
  const sportingNavigation = useSportingNavigation(active);
  const sporting = resource === "club" ? undefined : visit[resource];
  const filtersMissing = !!sporting && !sporting.filters;
  const read = filtersMissing ? sporting.query : query;
  const failed = hasReadError(read);
  const resultsReady = (searchable || examples) && !filtersMissing;

  /** Only the selected focused valid text context may request automatic continuation. */
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
        <ScreenState>
          <ReadFeedback
            key={filtersMissing ? "options" : criteria}
            query={read}
            loadingContent={null}
            onRetry={
              active
                ? () =>
                    !filtersMissing &&
                    !examples &&
                    textQuery.isFetchNextPageError
                      ? textQuery.fetchNextPage({ cancelRefetch: false })
                      : read.refetch({ cancelRefetch: false })
                : undefined
            }
          />
        </ScreenState>
      );
    } else if (filtersMissing || read.isPending) {
      if (read.isFetching) {
        emptyContent = (
          <PageContent>
            <SearchLoading />
          </PageContent>
        );
      }
    } else {
      emptyContent = (
        <ScreenState>
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
      key={criteria}
      onOpen={({ kind, identity }) => {
        Keyboard.dismiss();
        void sportingNavigation.navigate(kind, identity.id);
      }}
      examples={examples}
      items={resultsReady && !failed ? items : []}
      onEndReached={loadMore}
      emptyComponent={emptyContent}
      continuation={
        resultsReady && !failed && !examples && textQuery.isFetchingNextPage ? (
          <ListContinuation loading failed={false} onRetry={loadMore} />
        ) : undefined
      }
    />
  );
}
