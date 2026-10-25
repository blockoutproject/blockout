package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Current owner decisions protect hydration independently of any index or personal follow. */
@DisplayName("Current sporting owner reads")
class ReadSportingDataTest {
  private static final UUID MATCH = UUID.fromString("00000000-0000-4000-8000-000000000186");

  @ParameterizedTest
  @EnumSource(Reason.class)
  @DisplayName("Hidden or dateless direct links never hydrate retained match facts")
  void refusesHiddenHydration(Reason reason) {
    // Given
    SportingStore store = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    when(current.visibility(Kind.MATCH, MATCH))
        .thenReturn(Optional.of(new SportingVisibility(MATCH, Kind.MATCH, Set.of(reason))));
    ReadSportingData reads =
        new ReadSportingData(
            store,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);

    // When
    Optional<MatchView> result = reads.publicMatch(MATCH);

    // Then
    assertThat(result).isEmpty();
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("An eligible direct link keeps its exact retained identity")
  void hydratesSameIdentity() {
    // Given
    SportingStore store = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    MatchView match =
        new MatchView(
            MATCH,
            UUID.fromString("00000000-0000-4000-8000-000000000187"),
            "M1",
            UUID.fromString("00000000-0000-4000-8000-000000000188"),
            UUID.fromString("00000000-0000-4000-8000-000000000189"));
    when(current.visibility(Kind.MATCH, MATCH))
        .thenReturn(Optional.of(new SportingVisibility(MATCH, Kind.MATCH, Set.of())));
    when(store.match(MATCH)).thenReturn(Optional.of(match));
    ReadSportingData reads =
        new ReadSportingData(
            store,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);

    // When
    Optional<MatchView> result = reads.publicMatch(MATCH);

    // Then
    assertThat(result).contains(match);
  }

  @Test
  @DisplayName("Rechecks owner visibility on the next read without retaining a second registry")
  void rechecksVisibility() {
    // Given
    SportingStore facts = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    MatchView match = new MatchView(MATCH, MATCH, "source-reference", MATCH, MATCH);
    when(facts.match(MATCH)).thenReturn(Optional.of(match));
    when(current.visibility(Kind.MATCH, MATCH))
        .thenReturn(
            Optional.of(new SportingVisibility(MATCH, Kind.MATCH, Set.of())),
            Optional.of(new SportingVisibility(MATCH, Kind.MATCH, Set.of(Reason.DATE_UNKNOWN))));
    ReadSportingData reads =
        new ReadSportingData(
            facts,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);
    assertThat(reads.publicMatch(MATCH)).contains(match);

    // When
    Optional<MatchView> result = reads.publicMatch(MATCH);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Invalid rebuild page bounds never reach persistence")
  void boundsProjectionReads() {
    // Given
    SportingStore store = mock(SportingStore.class);
    SportingReadStore current = mock(SportingReadStore.class);
    ReadSportingData reads =
        new ReadSportingData(
            store,
            org.mapstruct.factory.Mappers.getMapper(
                com.blockout.backend.sporting.application.model.SportingModelMapper.class),
            current);

    // When
    ThrowingCallable invalidPage = () -> reads.projectionInputs(Kind.TEAM, -1, 20);
    ThrowingCallable invalidSize = () -> reads.projectionInputs(Kind.TEAM, 0, 201);

    // Then
    assertThatThrownBy(invalidPage).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(invalidSize).isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(store, current);
  }
}
