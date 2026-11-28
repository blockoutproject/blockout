package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchEngine.Batch;
import com.blockout.backend.search.application.SearchEngine.Candidate;
import com.blockout.backend.search.application.SearchEngine.Position;
import com.blockout.backend.sporting.application.ConsultationViews;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Current-data and consumed-boundary decisions with controlled external owners. */
@DisplayName("Current search traversal")
class ReadSearchTest {
  private final SearchContext context =
      new SearchContext(SearchContext.Resource.CLUB, "eagles", null, null, null, null, false);
  private final SearchEngine engine = mock(SearchEngine.class);
  private final HydrateSearch hydration = mock(HydrateSearch.class);
  private final ReadSearch search = new ReadSearch(engine, hydration);

  @Test
  @DisplayName("Continues before the first eligible candidate not returned on the page")
  void retainsUnconsumedCandidate() {
    // Given
    List<Candidate> candidates = IntStream.rangeClosed(1, 200).mapToObj(this::candidate).toList();
    when(engine.search(context, null, 200)).thenReturn(new Batch(candidates, false));
    when(hydration.current(context, candidates, 21))
        .thenReturn(summaries(candidates.subList(0, 21)));

    // When
    SearchPage page = search.read(context, null);

    // Then
    assertThat(page.items())
        .extracting(item -> item.club().club().id())
        .containsExactlyElementsOf(
            IntStream.rangeClosed(1, 20).mapToObj(number -> new UUID(0, number)).toList());
    assertThat(page.next()).isEqualTo(candidate(20).position());
  }

  @Test
  @DisplayName("Omits a continuation when a full page exactly exhausts eligible results")
  void establishesExactExhaustion() {
    // Given
    List<Candidate> candidates = IntStream.rangeClosed(1, 20).mapToObj(this::candidate).toList();
    when(engine.search(eq(context), any(), eq(200))).thenReturn(new Batch(candidates, true));
    when(hydration.current(context, candidates, 21)).thenReturn(summaries(candidates));

    // When
    SearchPage page = search.read(context, null);

    // Then
    assertThat(page.items())
        .extracting(item -> item.club().club().id())
        .containsExactlyElementsOf(
            IntStream.rangeClosed(1, 20).mapToObj(number -> new UUID(0, number)).toList());
    assertThat(page.next()).isNull();
  }

  @Test
  @DisplayName(
      "Fails instead of returning an empty continuation when bounded hydration finds no eligible data")
  void refusesFalseEmptyPage() {
    // Given
    List<Candidate> candidates = IntStream.rangeClosed(1, 10).mapToObj(this::candidate).toList();
    when(engine.search(context, null, 200))
        .thenReturn(new Batch(List.of(candidates.getFirst()), false));
    for (int page = 1; page < candidates.size(); page++) {
      when(engine.search(context, candidates.get(page - 1).position(), 200))
          .thenReturn(new Batch(List.of(candidates.get(page)), false));
    }
    when(hydration.current(eq(context), any(), anyInt())).thenReturn(Map.of());

    // When / Then
    assertThatThrownBy(() -> search.read(context, null))
        .isInstanceOf(SearchUnavailableException.class);
  }

  @Test
  @DisplayName(
      "Returns a partial page at the processing bound before its reserved eligible candidate")
  void returnsPartialContinuation() {
    // Given
    List<Candidate> candidates = IntStream.rangeClosed(1, 10).mapToObj(this::candidate).toList();
    when(engine.search(context, null, 200))
        .thenReturn(new Batch(List.of(candidates.getFirst()), false));
    for (int page = 1; page < 9; page++) {
      when(engine.search(context, candidates.get(page - 1).position(), 200))
          .thenReturn(new Batch(List.of(candidates.get(page)), false));
    }
    when(engine.search(context, candidate(9).position(), 200))
        .thenReturn(
            new Batch(List.of(candidate(10)), false), new Batch(List.of(candidate(10)), true));
    when(hydration.current(context, List.of(candidate(1)), 21))
        .thenReturn(summaries(List.of(candidate(1))));
    when(hydration.current(eq(context), eq(List.of(candidate(10))), anyInt()))
        .thenReturn(summaries(List.of(candidate(10))));

    // When
    SearchPage first = search.read(context, null);
    SearchPage last = search.read(context, first.next());

    // Then
    assertThat(first.items())
        .extracting(item -> item.club().club().id())
        .containsExactly(new UUID(0, 1));
    assertThat(first.next()).isEqualTo(candidate(9).position());
    assertThat(last.items())
        .extracting(item -> item.club().club().id())
        .containsExactly(new UUID(0, 10));
    assertThat(last.next()).isNull();
  }

  @Test
  @DisplayName("Propagates engine failure even after hydrating eligible results")
  void rejectsPartialEngineFailure() {
    // Given
    when(engine.search(eq(context), any(), eq(200)))
        .thenReturn(new Batch(List.of(candidate(1)), false))
        .thenThrow(new SearchUnavailableException());
    when(hydration.current(context, List.of(candidate(1)), 21))
        .thenReturn(summaries(List.of(candidate(1))));

    // When / Then
    assertThatThrownBy(() -> search.read(context, null))
        .isInstanceOf(SearchUnavailableException.class);
  }

  @Test
  @DisplayName("Seeks beyond stale candidates before promising continuation from a full page")
  void seeksEligibleLookahead() {
    // Given
    List<Candidate> firstBatch = IntStream.rangeClosed(1, 200).mapToObj(this::candidate).toList();
    List<Candidate> lastBatch = List.of(candidate(201), candidate(202));
    when(engine.search(context, null, 200)).thenReturn(new Batch(firstBatch, false));
    when(engine.search(context, candidate(200).position(), 200))
        .thenReturn(new Batch(lastBatch, true));
    when(hydration.current(context, firstBatch, 21))
        .thenReturn(summaries(firstBatch.subList(0, 20)));
    when(hydration.current(context, lastBatch, 1)).thenReturn(summaries(List.of(candidate(201))));

    // When
    SearchPage page = search.read(context, null);

    // Then
    assertThat(page.items())
        .extracting(item -> item.club().club().id())
        .containsExactlyElementsOf(
            IntStream.rangeClosed(1, 20).mapToObj(number -> new UUID(0, number)).toList());
    assertThat(page.next()).isEqualTo(candidate(200).position());
  }

  @Test
  @DisplayName("Requests only the remaining example when four have already been selected")
  void fillsRemainingExampleSlot() {
    // Given
    SearchContext examples =
        new SearchContext(SearchContext.Resource.CLUB, "", null, null, null, null, false);
    List<Candidate> firstBatch = IntStream.rangeClosed(1, 200).mapToObj(this::candidate).toList();
    List<Candidate> lastBatch = List.of(candidate(201), candidate(202));
    when(engine.search(examples, null, 200)).thenReturn(new Batch(firstBatch, false));
    when(engine.search(examples, candidate(200).position(), 200))
        .thenReturn(new Batch(lastBatch, true));
    when(hydration.current(examples, firstBatch, 5))
        .thenReturn(summaries(firstBatch.subList(0, 4)));
    when(hydration.current(examples, lastBatch, 1)).thenReturn(summaries(List.of(candidate(201))));

    // When
    SearchPage page = search.read(examples, null);

    // Then
    assertThat(page.items())
        .extracting(item -> item.club().club().id())
        .containsExactly(
            new UUID(0, 1), new UUID(0, 2), new UUID(0, 3), new UUID(0, 4), new UUID(0, 201));
    assertThat(page.next()).isNull();
  }

  /**
   * Builds one exact synthetic native boundary; score ties exercise UUID ordering.
   *
   * @param number stable UUID suffix determining candidate order
   * @return candidate with the shared synthetic indexed city
   */
  private Candidate candidate(int number) {
    return new Candidate(new Position(1.0, new UUID(0, number)), "Lyon");
  }

  /** Provides the controlled owner's current club presentation for each selected candidate. */
  private Map<UUID, SearchPage.Summary> summaries(List<Candidate> admitted) {
    Map<UUID, SearchPage.Summary> result = new HashMap<>();
    for (Candidate candidate : admitted) {
      UUID id = candidate.position().id();
      ConsultationViews.Identity club =
          new ConsultationViews.Identity(id, "Current name", null, null);
      result.put(id, new SearchPage.Summary(new SearchPage.Club(club, "Lyon"), null, null));
    }
    return result;
  }
}
