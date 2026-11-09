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
  > &
    Partial<Pick<UseQueryResult, "isEnabled">>;
}

/**
 * Presents only an actively fetching initial read or its safe retry.
 * An admitted pending read without an active fetch uses the existing unavailable card.
 * Disabled observations never start recovery here; their prerequisite belongs to the feature owner.
 */
export function ReadFeedback({
  query,
  loadingContent,
}: Readonly<ReadFeedbackProps>) {
  if (query.isEnabled === false) {
    return query.isError ? <ErrorState /> : null;
  }
  if (query.isPending && query.isFetching) {
    return loadingContent;
  }
  if (!query.isError && !query.isPending) {
    return null;
  }
  return (
    <ErrorState
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}
