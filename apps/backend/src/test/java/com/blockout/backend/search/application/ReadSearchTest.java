package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchEngine.Batch;
import com.blockout.backend.search.application.SearchEngine.Candidate;
import com.blockout.backend.search.application.SearchEngine.Position;
import com.blockout.backend.sporting.application.ConsultationViews;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Current-data and consumed-boundary decisions with controlled external owners. */
@DisplayName("Hydrated textual search")
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
    List<Candidate> candidates = IntStream.rangeClosed(1, 21).mapToObj(this::candidate).toList();
    when(engine.search(eq(context), any(), eq(200))).thenReturn(new Batch(candidates, true));
    when(hydration.current(eq(context), any()))
        .thenReturn(
            candidates.stream()
                .collect(
                    java.util.stream.Collectors.toMap(
                        c -> c.position().id(), c -> summary(c.position().id()))));

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
    when(hydration.current(eq(context), any()))
        .thenReturn(
            candidates.stream()
                .collect(
                    java.util.stream.Collectors.toMap(
                        c -> c.position().id(), c -> summary(c.position().id()))));

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
    when(hydration.current(eq(context), any())).thenReturn(Map.of());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read = () -> search.read(context, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(SearchUnavailableException.class);
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
    when(hydration.current(context, List.of(candidate(1))))
        .thenReturn(Map.of(new UUID(0, 1), summary(new UUID(0, 1))));
    when(hydration.current(context, List.of(candidate(10))))
        .thenReturn(Map.of(new UUID(0, 10), summary(new UUID(0, 10))));

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
    when(hydration.current(eq(context), any()))
        .thenReturn(Map.of(new UUID(0, 1), summary(new UUID(0, 1))));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read = () -> search.read(context, null);

    // Then
    assertThatThrownBy(read).isInstanceOf(SearchUnavailableException.class);
  }

  @Test
  @DisplayName("Seeks beyond stale candidates before promising continuation from a full page")
  void seeksEligibleLookahead() {
    // Given
    List<Candidate> firstBatch = IntStream.rangeClosed(1, 22).mapToObj(this::candidate).toList();
    Map<UUID, SearchPage.Summary> firstPage =
        IntStream.rangeClosed(1, 20)
            .boxed()
            .collect(
                java.util.stream.Collectors.toMap(
                    number -> new UUID(0, number), number -> summary(new UUID(0, number))));
    when(engine.search(context, null, 200)).thenReturn(new Batch(firstBatch, false));
    when(engine.search(context, candidate(22).position(), 200))
        .thenReturn(new Batch(List.of(candidate(23)), true));
    when(hydration.current(context, firstBatch.subList(0, 21))).thenReturn(firstPage);
    when(hydration.current(context, List.of(candidate(23))))
        .thenReturn(Map.of(new UUID(0, 23), summary(new UUID(0, 23))));

    // When
    SearchPage page = search.read(context, null);

    // Then
    assertThat(page.items())
        .extracting(item -> item.club().club().id())
        .containsExactlyElementsOf(
            IntStream.rangeClosed(1, 20).mapToObj(number -> new UUID(0, number)).toList());
    assertThat(page.next()).isEqualTo(candidate(22).position());
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

  /**
   * Provides a current public club summary without any index presentation.
   *
   * @param id exact admitted candidate identity
   * @return current controlled owner summary
   */
  private SearchPage.Summary summary(UUID id) {
    return new SearchPage.Summary(
        new SearchPage.Club(new ConsultationViews.Identity(id, "Current name", null, null), "Lyon"),
        null,
        null);
  }
}
