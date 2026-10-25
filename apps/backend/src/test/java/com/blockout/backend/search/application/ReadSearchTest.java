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
    List<Candidate> candidates = IntStream.rangeClosed(1, 47).mapToObj(this::candidate).toList();
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
    assertThat(page.items()).hasSize(20);
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
    assertThat(page.items()).hasSize(20);
    assertThat(page.next()).isNull();
  }

  @Test
  @DisplayName(
      "Fails instead of returning an empty continuation when bounded hydration finds no eligible data")
  void refusesFalseEmptyPage() {
    // Given
    when(engine.search(eq(context), any(), eq(200)))
        .thenReturn(
            new Batch(IntStream.rangeClosed(1, 200).mapToObj(this::candidate).toList(), false));
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
    when(engine.search(eq(context), any(), eq(200)))
        .thenAnswer(
            invocation -> {
              Position after = invocation.getArgument(1);
              int start = after == null ? 1 : (int) after.id().getLeastSignificantBits() + 1;
              List<Candidate> batch =
                  IntStream.range(start, Math.min(start + 200, 2001))
                      .mapToObj(this::candidate)
                      .toList();
              return new Batch(batch, batch.size() < 200);
            });
    when(hydration.current(eq(context), any()))
        .thenAnswer(
            invocation -> {
              List<Candidate> candidates = invocation.getArgument(1);
              return candidates.stream()
                  .filter(
                      c ->
                          c.position().id().getLeastSignificantBits() == 1
                              || c.position().id().getLeastSignificantBits() == 2000)
                  .collect(
                      java.util.stream.Collectors.toMap(
                          c -> c.position().id(), c -> summary(c.position().id())));
            });

    // When
    SearchPage first = search.read(context, null);
    SearchPage last = search.read(context, first.next());

    // Then
    assertThat(first.items())
        .extracting(item -> item.club().club().id())
        .containsExactly(new UUID(0, 1));
    assertThat(first.next()).isEqualTo(candidate(1999).position());
    assertThat(last.items())
        .extracting(item -> item.club().club().id())
        .containsExactly(new UUID(0, 2000));
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
  @DisplayName("Keeps current hydration batched while seeking lookahead after a full page")
  void batchesLookaheadHydration() {
    // Given
    List<Integer> batchSizes = new java.util.ArrayList<>();
    when(engine.search(eq(context), any(), eq(200)))
        .thenAnswer(
            invocation -> {
              Position after = invocation.getArgument(1);
              int start = after == null ? 1 : (int) after.id().getLeastSignificantBits() + 1;
              return new Batch(
                  IntStream.range(start, start + 200).mapToObj(this::candidate).toList(), false);
            });
    when(hydration.current(eq(context), any()))
        .thenAnswer(
            invocation -> {
              List<Candidate> candidates = invocation.getArgument(1);
              batchSizes.add(candidates.size());
              return candidates.stream()
                  .filter(c -> c.position().id().getLeastSignificantBits() <= 20)
                  .collect(
                      java.util.stream.Collectors.toMap(
                          c -> c.position().id(), c -> summary(c.position().id())));
            });

    // When
    SearchPage page = search.read(context, null);

    // Then
    assertThat(page.items()).hasSize(19);
    assertThat(page.next()).isEqualTo(candidate(19).position());
    assertThat(batchSizes.stream().filter(size -> size == 1).count()).isZero();
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
