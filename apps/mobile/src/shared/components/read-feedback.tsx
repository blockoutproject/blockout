import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ErrorState } from "./state-card";

/** Initial-read presentation only; owners retain usable rows, independent sections and drafts under their safeguards. */
export interface ReadFeedbackProps {
  /** The known content supplies its shape; its owner places pending content in the normal content flow. */
  loadingContent: ReactNode;
  query: Pick<
    UseQueryResult,
    "isPending" | "isError" | "refetch" | "isFetching"
  >;
}

/**
 * Presents only an actively fetching initial read or its safe retry.
 * Pending observations without a fetch remain silent; admission failures stay with their feature owner.
 */
export function ReadFeedback({ query, loadingContent }: ReadFeedbackProps) {
  if (query.isPending && query.isFetching) return loadingContent;
  if (!query.isError) return null;
  return (
    <ErrorState
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}
