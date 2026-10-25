package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.SportingVisibility.Reason;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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
  @EnumSource(
      value = Reason.class,
      names = {"ITEM_ABSENT", "DATE_UNKNOWN", "CATALOG_ABSENT", "DIVISION_INACTIVE"})
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
  @DisplayName("Public projection values detach aliases and participations from mutable inputs")
  void freezesPublicValues() {
    // Given
    Set<SportingPublicInput.Alias> aliases = new HashSet<>();
    List<UUID> pools = new ArrayList<>(List.of(MATCH));
    SportingPublicInput input =
        new SportingPublicInput(
            MATCH,
            Kind.TEAM,
            null,
            "Source",
            "Effective",
            "Short",
            aliases,
            null,
            null,
            Set.of(),
            null,
            null,
            null,
            pools);

    // When
    aliases.add(new SportingPublicInput.Alias(MATCH, "ORG", "COMP", "Alias"));
    pools.clear();

    // Then
    assertThat(input.aliases()).isEmpty();
    assertThat(input.poolIds()).containsExactly(MATCH);
    assertThatThrownBy(() -> input.poolIds().clear())
        .isInstanceOf(UnsupportedOperationException.class);
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
