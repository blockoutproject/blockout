import type { UseQueryResult } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ErrorState } from "./state-card";

/** Native Query metadata; data, failures and request lifetimes remain with the query owner. */
export type ReadFeedbackQuery = Pick<
  UseQueryResult,
  "isPending" | "isError" | "refetch" | "isFetching"
> &
  Partial<Pick<UseQueryResult, "isEnabled" | "errorUpdatedAt">>;

/** Required-read feedback; the owner chooses its scope and preserves authorized data and children separately. */
export interface ReadFeedbackProps {
  /** The known content supplies its shape; its owner places pending content in the normal content flow. */
  loadingContent: ReactNode;
  query: ReadFeedbackQuery;
  /** A successful response may report required content unavailable without becoming a transport error. */
  failed?: boolean;
  /**
   * The owner supplies a safe explicit read, including when automatic fetching is disabled.
   * Omitted consumers use this enabled query's refetch.
   */
  onRetry?: () => Promise<unknown>;
}

/**
 * Keeps a first failed read visible when Query returns to pending during recovery.
 * Query retains errorUpdatedAt across that fetch; a new key starts with its own native metadata.
 */
export function hasReadError(query: ReadFeedbackQuery): boolean {
  return query.isError || (query.isPending && !!query.errorUpdatedAt);
}

/**
 * Uses structural loading only for an active first read and retains Error through its explicit Retry.
 * Only the gesture's promise combined with actual fetching makes the button busy; background and paused reads do not.
 * Owners key this component by their read context when the same mounted region changes resource or criteria.
 */
export function ReadFeedback({
  query,
  loadingContent,
  failed = false,
  onRetry,
}: Readonly<ReadFeedbackProps>) {
  const [retryRequested, setRetryRequested] = useState(false);
  // Observe fetch changes before the gesture so Query also notifies a card mounted after an earlier failure.
  const fetching = query.isFetching;
  const error = failed || hasReadError(query);

  /** Tracks only the explicit gesture; Query and the feature retain the read outcome and cancellation. */
  async function retry() {
    if (retryRequested) {
      return;
    }
    setRetryRequested(true);
    try {
      await (onRetry ? onRetry() : query.refetch());
    } finally {
      setRetryRequested(false);
    }
  }

  if (query.isEnabled === false && !onRetry) {
    return error ? <ErrorState /> : null;
  }
  if (!error && !retryRequested && query.isPending && fetching) {
    return loadingContent;
  }
  if (!error && !retryRequested) {
    return null;
  }
  return (
    <ErrorState
      onRetry={() => void retry()}
      retrying={retryRequested && fetching}
    />
  );
}
