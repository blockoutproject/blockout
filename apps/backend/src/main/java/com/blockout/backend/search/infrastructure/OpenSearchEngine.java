package com.blockout.backend.search.infrastructure;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.application.SearchUnavailableException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.FieldValue;
import org.opensearch.client.opensearch._types.SortOrder;
import org.opensearch.client.opensearch._types.query_dsl.BoolQuery;
import org.opensearch.client.opensearch._types.query_dsl.Operator;
import org.opensearch.client.opensearch._types.query_dsl.Query;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.search.Hit;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Official native query adapter; disabled infrastructure remains ordinary unavailability. */
@Component
@Slf4j
@EnableConfigurationProperties(SearchIndexProperties.class)
public class OpenSearchEngine implements SearchEngine {
  private final OpenSearchClient client;
  private final SearchIndexProperties indexes;

  /**
   * Uses the selected native client, absent only when search infrastructure is disabled.
   *
   * @param client configured official client or null
   * @param indexes current environment alias namespace
   */
  public OpenSearchEngine(@Nullable OpenSearchClient client, SearchIndexProperties indexes) {
    this.client = client;
    this.indexes = indexes;
  }

  /** {@inheritDoc} */
  @Override
  public Batch search(SearchContext context, Position after, int size) {
    return execute(context, after, size, null);
  }

  /** {@inheritDoc} */
  @Override
  public Batch examples(SearchContext context, List<UUID> identities) {
    if (!context.examples() || identities.isEmpty() || identities.size() > 5)
      throw new IllegalArgumentException("Invalid retained examples");
    return execute(context, null, 5, identities);
  }

  /**
   * Executes one complete native response; empty text gives every exact-filter candidate the same
   * score.
   *
   * @param context current selection with exact filters
   * @param after exclusive native boundary or null
   * @param size bounded candidate count
   * @param identities retained UUID restriction, or null for ordinary initial candidate traversal
   * @return fully evaluated native candidates; no total is requested
   */
  private Batch execute(SearchContext context, Position after, int size, List<UUID> identities) {
    if (size < 1 || size > 200) throw new IllegalArgumentException("Invalid candidate batch");
    if (client == null) throw new SearchUnavailableException();
    try {
      SearchRequest.Builder request =
          new SearchRequest.Builder()
              .index(indexes.alias(context.resource()))
              .size(size)
              .allowPartialSearchResults(false)
              .trackTotalHits(track -> track.enabled(false))
              .source(source -> source.filter(filter -> filter.includes("city")))
              .query(query(context, identities))
              .sort(sort -> sort.score(score -> score.order(SortOrder.Desc)))
              .sort(sort -> sort.field(field -> field.field("id").order(SortOrder.Asc)));
      if (after != null)
        request.searchAfter(
            List.of(FieldValue.of(after.score()), FieldValue.of(after.id().toString())));
      SearchResponse<IndexedCity> response = client.search(request.build(), IndexedCity.class);
      if (response.timedOut()
          || Boolean.TRUE.equals(response.terminatedEarly())
          || response.shards().failed() != 0
          || response.shards().successful() != response.shards().total())
        throw new SearchUnavailableException();
      List<Candidate> candidates = new ArrayList<>();
      for (Hit<IndexedCity> hit : response.hits().hits()) {
        if (hit.sort().size() != 2 || hit.source() == null) throw new SearchUnavailableException();
        double score = hit.sort().get(0).doubleValue();
        UUID id = UUID.fromString(hit.sort().get(1).stringValue());
        if (!Double.isFinite(score) || score < 0 || !id.toString().equals(hit.id()))
          throw new SearchUnavailableException();
        candidates.add(new Candidate(new Position(score, id), hit.source().city()));
      }
      return new Batch(candidates, candidates.size() < size);
    } catch (IOException | RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "search_candidates")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue(
              "reason",
              failure instanceof SearchUnavailableException
                  ? "incomplete_response"
                  : "engine_failed")
          .addKeyValue("error.type", failure.getClass().getName())
          .log("Native search unavailable");
      // Engine exceptions can contain query/source values. The shared HTTP owner receives only
      // this safe failure and never logs the raw payload or treats failure as successful empty.
      if (failure instanceof SearchUnavailableException unavailable) throw unavailable;
      throw new SearchUnavailableException(failure);
    }
  }

  /**
   * Requires either a complete prefix branch or a complete whole-word fuzzy branch. Native optional
   * boosts cannot admit a document that fails both required branches.
   *
   * @param context exact current selection; empty text uses only exact filters
   * @param identities retained example restriction or null
   * @return ordinary typed OpenSearch query with strict filters outside the alternatives
   */
  private Query query(SearchContext context, List<UUID> identities) {
    BoolQuery.Builder query = new BoolQuery.Builder();
    if (!context.examples())
      query
          .must(
              required ->
                  required.bool(
                      branches ->
                          branches
                              .should(
                                  prefix ->
                                      prefix.match(
                                          match ->
                                              match
                                                  .field("prefixes")
                                                  .query(FieldValue.of(context.text()))
                                                  .operator(Operator.And)))
                              .should(
                                  fuzzy ->
                                      fuzzy.match(
                                          match ->
                                              match
                                                  .field("words")
                                                  .query(FieldValue.of(context.text()))
                                                  .operator(Operator.And)
                                                  .fuzziness("AUTO")))
                              .minimumShouldMatch("1")))
          .should(
              direct ->
                  direct.match(
                      match ->
                          match
                              .field("words")
                              .query(FieldValue.of(context.text()))
                              .operator(Operator.And)
                              .boost(2.0F)))
          .should(
              name ->
                  name.match(
                      match ->
                          match
                              .field("names")
                              .query(FieldValue.of(context.text()))
                              .operator(Operator.And)
                              .boost(3.0F)))
          .should(
              exact ->
                  exact.term(
                      term ->
                          term.field("names.exact")
                              .value(FieldValue.of(context.text()))
                              .boost(4.0F)));
    if (identities != null)
      query.filter(
          filter ->
              filter.ids(ids -> ids.values(identities.stream().map(UUID::toString).toList())));
    if (context.seasonId() != null) filter(query, "seasonId", context.seasonId().toString());
    if (context.divisionId() != null) filter(query, "divisionId", context.divisionId().toString());
    if (context.format() != null) filter(query, "format", context.format().getValue());
    if (context.gender() != null) filter(query, "gender", context.gender().getValue());
    return query.build().toQuery();
  }

  /**
   * Adds one exact keyword filter without any text-based fallback or broadening.
   *
   * @param query native complete-text query receiving the restriction
   * @param field owned keyword field
   * @param value exact canonical wire value
   */
  private void filter(BoolQuery.Builder query, String field, String value) {
    query.filter(filter -> filter.term(term -> term.field(field).value(FieldValue.of(value))));
  }

  /** Narrow native source selection used only for the indexed/current city guard. */
  public record IndexedCity(String city) {}
}
