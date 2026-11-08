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
   * @param context normalized text and exact restrictions; empty text selects current examples
   * @param after exclusive consumed boundary, or null for the first page
   * @return up to twenty textual results with continuation, or five examples without pagination
   * @throws SearchUnavailableException when the engine or SQL hydration fails, or bounded
   *     evaluation cannot establish a useful page or end
   * @throws IllegalArgumentException when an example read supplies a continuation
   */
  @Transactional(propagation = Propagation.NEVER)
  public SearchPage read(SearchContext context, SearchEngine.Position after) {
    if (context.examples() && after != null) {
      throw new IllegalArgumentException("Examples forbid continuation");
    }
    try {
      return traverse(context, after);
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
      Map<UUID, SearchPage.Summary> current =
          batch.candidates().isEmpty() ? Map.of() : hydration.current(context, batch.candidates());
      for (SearchEngine.Candidate candidate : batch.candidates()) {
        SearchPage.Summary summary = current.get(candidate.position().id());
        if (summary != null) {
          if (context.examples() && results.size() == 4) {
            results.add(summary);
            return new SearchPage(results, null);
          }
          if (results.size() == 20) {
            return new SearchPage(results, consumed);
          }
          beforeLastEligible = consumed;
          results.add(summary);
        }
        consumed = candidate.position();
      }
      if (batch.exhausted()) {
        return new SearchPage(results, null);
      }
    }
    if (context.examples() && !results.isEmpty()) {
      return new SearchPage(results, null);
    }
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
