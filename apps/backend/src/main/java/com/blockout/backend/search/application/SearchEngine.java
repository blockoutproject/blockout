package com.blockout.backend.search.application;

import java.util.List;
import java.util.UUID;

/** Native candidate selection; implementations never return public presentation. */
public interface SearchEngine {
  /**
   * Reads a bounded complete native response after the exclusive position.
   *
   * @param context textual or empty-text selection with exact filters
   * @param after consumed score/identity boundary, or null initially
   * @param size candidate count from 1 through 200
   * @return detached ordered candidates and whether the engine is exhausted
   * @throws SearchUnavailableException for timeout, partial response or dependency failure
   */
  Batch search(SearchContext context, Position after, int size);

  /**
   * Reads only retained example identities through the same exact native filters and city
   * projection.
   *
   * @param context empty-text selection
   * @param identities at most five retained UUIDs; no replacements are selected
   * @return complete candidates for these identities, in native UUID order
   * @throws SearchUnavailableException for an incomplete or failed native read
   */
  Batch examples(SearchContext context, List<UUID> identities);

  /** Exclusive native score-descending, UUID-ascending position; no retained engine session. */
  record Position(double score, UUID id) {}

  /** Only indexed city crosses into current hydration, never obsolete public presentation. */
  record Candidate(Position position, String city) {}

  /** One fully evaluated engine batch; exhaustion is established by the native short read. */
  record Batch(List<Candidate> candidates, boolean exhausted) {
    /**
     * Detaches the response before the engine adapter returns.
     *
     * @param candidates ordered native hits
     * @param exhausted established engine short read
     */
    public Batch {
      candidates = List.copyOf(candidates);
    }
  }
}
