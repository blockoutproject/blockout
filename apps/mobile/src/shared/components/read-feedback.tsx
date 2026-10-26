import type { UseQueryResult } from "@tanstack/react-query";
import { RequestLoading } from "./request-feedback";
import { ErrorState } from "./state-card";

/** Initial-read presentation only; owners decide when retained data or a draft remains usable. */
export interface ReadFeedbackProps {
  query: Pick<
    UseQueryResult,
    "isPending" | "isError" | "refetch" | "isFetching"
  >;
}

/** Presents native Query progress and a read-only retry without introducing a request state mirror. */
export function ReadFeedback({ query }: ReadFeedbackProps) {
  if (query.isPending) return <RequestLoading />;
  if (!query.isError) return null;
  return (
    <ErrorState
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}
