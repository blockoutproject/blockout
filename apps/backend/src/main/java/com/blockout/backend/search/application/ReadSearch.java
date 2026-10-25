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

/** Textual traversal orchestration; engine calls occur outside the SQL hydration transaction. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReadSearch {
  private final SearchEngine engine;
  private final SearchHydration hydration;

  /**
   * Reads current results after a consumed position without retaining a result set.
   *
   * @param context nonempty text and exact restrictions
   * @param after exclusive consumed boundary, or null for the first page
   * @return up to twenty current summaries with a continuation only before an eligible candidate
   * @throws SearchUnavailableException when bounded evaluation cannot establish a useful page or
   *     end
   */
  @Transactional(propagation = Propagation.NEVER)
  public SearchPage read(SearchContext context, SearchEngine.Position after) {
    if (context.examples())
      throw new IllegalArgumentException("Text search requires nonempty text");
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
   * bound with several results returns a partial page before its last eligible candidate.
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
