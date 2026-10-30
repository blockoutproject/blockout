package com.blockout.backend.search.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Textual traversal and bounded examples; engine calls occur outside the SQL hydration transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReadSearch {
  private final SearchEngine engine;
  private final HydrateSearch hydration;

  /**
   * Reads current results after a consumed position without retaining a result set.
   *
   * @param context normalized text and exact restrictions; empty text selects initial examples
   * @param after exclusive consumed boundary, or null for the first page
   * @return up to twenty textual results with continuation, or five examples without pagination
   * @throws SearchUnavailableException when bounded evaluation cannot establish a useful page or
   *     end
   */
  @Transactional(propagation = Propagation.NEVER)
  public SearchPage read(SearchContext context, SearchEngine.Position after) {
    return read(context, after, null);
  }

  /**
   * Rereads only the retained identities in supplied order through current hydration.
   *
   * @param context empty text and exact filters
   * @param examples detached visit selection; empty stays empty without an engine request
   * @return currently eligible retained summaries without pagination or replacements
   */
  @Transactional(propagation = Propagation.NEVER)
  public SearchPage examples(SearchContext context, SearchExamples examples) {
    if (!context.examples())
      throw new IllegalArgumentException("Retained examples require empty text");
    return read(context, null, examples);
  }

  /**
   * Translates SQL acquisition/completion failures for both ordinary and retained current reads.
   *
   * @param context normalized text and exact current filters
   * @param after exclusive textual position, absent for examples
   * @param examples retained selection or null for an initial collection read
   * @return current summaries without replacements or manufactured exhaustion
   * @throws SearchUnavailableException when the engine or current SQL hydration cannot complete
   */
  private SearchPage read(
      SearchContext context, SearchEngine.Position after, SearchExamples examples) {
    if (context.examples() && after != null)
      throw new IllegalArgumentException("Examples forbid continuation");
    try {
      if (examples == null) return traverse(context, after);
      if (examples.identities().isEmpty()) return new SearchPage(List.of(), null);
      SearchEngine.Batch batch = engine.examples(context, examples.identities());
      Map<UUID, SearchPage.Summary> current = hydration.current(context, batch.candidates());
      return new SearchPage(
          examples.identities().stream()
              .map(current::get)
              .filter(java.util.Objects::nonNull)
              .toList(),
          null);
    } catch (DataAccessException | TransactionException failure) {
      log.atError()
          .addKeyValue("operation", "search_hydration")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue(
              "reason",
              failure instanceof DataAccessException
                  ? "database_unavailable"
                  : "transaction_failed")
          .log("Current search hydration unavailable");
      throw new SearchUnavailableException(failure);
    }
  }

  /**
   * Consumes bounded batches, reserving one eligible lookahead before promising continuation. A
   * bound with several results returns a partial textual page before its last eligible candidate.
   * Examples stop at five eligible UUIDs and return no continuation or completeness claim.
   *
   * @param context current exact selection
   * @param after exclusive initial boundary
   * @return useful current page or established end
   */
  private SearchPage traverse(SearchContext context, SearchEngine.Position after) {
    List<SearchPage.Summary> results = new ArrayList<>();
    SearchEngine.Position beforeLastEligible = null;
    SearchEngine.Position consumed = after;
    for (int batchNumber = 0; batchNumber < 10; batchNumber++) {
      SearchEngine.Batch batch = engine.search(context, consumed, 200);
      int offset = 0;
      while (offset < batch.candidates().size()) {
        int end = Math.min(batch.candidates().size(), offset + 21);
        List<SearchEngine.Candidate> slice = batch.candidates().subList(offset, end);
        Map<UUID, SearchPage.Summary> current = hydration.current(context, slice);
        for (SearchEngine.Candidate candidate : slice) {
          SearchPage.Summary summary = current.get(candidate.position().id());
          if (summary != null) {
            if (context.examples() && results.size() == 4) {
              results.add(summary);
              return new SearchPage(results, null);
            }
            if (results.size() == 20) return new SearchPage(results, consumed);
            beforeLastEligible = consumed;
            results.add(summary);
          }
          consumed = candidate.position();
        }
        offset = end;
      }
      if (batch.exhausted()) return new SearchPage(results, null);
    }
    if (context.examples() && !results.isEmpty()) return new SearchPage(results, null);
    if (results.size() < 2) {
      log.atWarn()
          .addKeyValue("operation", "search_traversal")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue("reason", "evaluation_bound")
          .log("Search evaluation bound reached");
      throw new SearchUnavailableException();
    }
    results.removeLast();
    return new SearchPage(results, beforeLastEligible);
  }
}
