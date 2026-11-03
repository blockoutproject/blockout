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

/** Presents native Query progress and a read-only retry without introducing a request state mirror. */
export function ReadFeedback({ query, loadingContent }: ReadFeedbackProps) {
  if (query.isPending) return loadingContent;
  if (!query.isError) return null;
  return (
    <ErrorState
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}
