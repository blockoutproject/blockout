package com.blockout.backend.search.application;

import java.util.List;
import java.util.UUID;

/** Native candidate selection; implementations never return public presentation. */
public interface SearchEngine {
  /**
   * Reads a bounded complete native response after the exclusive position.
   *
   * @param context nonempty textual selection with exact filters
   * @param after consumed score/identity boundary, or null initially
   * @param size candidate count from 1 through 200
   * @return detached ordered candidates and whether the engine is exhausted
   * @throws SearchUnavailableException for timeout, partial response or dependency failure
   */
  Batch search(SearchContext context, Position after, int size);

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
