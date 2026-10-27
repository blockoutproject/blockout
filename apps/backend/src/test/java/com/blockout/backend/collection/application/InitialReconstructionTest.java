package com.blockout.backend.collection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.InitialReconstructionService;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

/** Explicit initial intent without provider access, periodic activation or implicit widening. */
@DisplayName("Bounded initial reconstruction requests")
class InitialReconstructionTest {
  private static final UUID OPERATOR = UUID.fromString("00000000-0000-4000-8000-000000000257");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000258");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000259");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000260");
  private final CollectionStore store = mock(CollectionStore.class);
  private final ChangeCollectionSeasons seasons = mock(ChangeCollectionSeasons.class);
  private final ActionAuthorization authorization = mock(ActionAuthorization.class);
  private final InitialReconstructionService service =
      new InitialReconstructionService(
          store,
          seasons,
          mock(ReadCollectionConfiguration.class),
          mock(PrepareCollectionSources.class),
          authorization);

  @Test
  @DisplayName("Requires current collection permission before retaining initial intent")
  void refusesMissingPermission() {
    // Given
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(season(CollectionSeasonStateEnum.PREPARING));
    doThrow(new AccessDeniedException("refused"))
        .when(authorization)
        .require(OPERATOR, Permission.MANAGE_COLLECTION);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request =
        () -> service.request(OPERATOR, SEASON, 0, Set.of(SOURCE), Set.of());

    // Then
    assertThatThrownBy(request).isInstanceOf(AccessDeniedException.class);
    verify(store, never()).setInitialIntent(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Refuses a closed season without creating a control")
  void refusesClosedHistory() {
    // Given
    when(seasons.lockCollectionState(SEASON)).thenReturn(season(CollectionSeasonStateEnum.CLOSED));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request =
        () -> service.request(OPERATOR, SEASON, 0, Set.of(SOURCE), Set.of());

    // Then
    assertThatThrownBy(request).isInstanceOf(CollectionConflictException.class);
    verify(store, never()).setInitialIntent(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Refuses missing seasonal confirmation before retaining intent")
  void refusesUnqualifiedReference() {
    // Given
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(season(CollectionSeasonStateEnum.PREPARING));
    when(store.sources(SEASON))
        .thenReturn(List.of(source(SourceValidationStateEnum.CONFIRMATION_REQUIRED)));
    when(store.prepareInitialControl(SEASON, CollectionProviderEnum.FFVB))
        .thenReturn(
            new Control(
                CONTROL,
                SEASON,
                CollectionFamilyEnum.FFVB,
                0,
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                Set.of(),
                Set.of()));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request =
        () -> service.request(OPERATOR, SEASON, 0, Set.of(SOURCE), Set.of());

    // Then
    assertThatThrownBy(request).isInstanceOf(CollectionConflictException.class);
    verify(store, never()).setInitialIntent(any(), any(), any(), any());
  }

  @Test
  @DisplayName("An identical pending selection is read without a second request")
  void keepsIdenticalPendingSelection() {
    // Given
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(season(CollectionSeasonStateEnum.PREPARING));
    when(store.sources(SEASON)).thenReturn(List.of(source(SourceValidationStateEnum.QUALIFIED)));
    Control pending = control(Set.of(SOURCE));
    when(store.controls(SEASON)).thenReturn(List.of(pending));
    when(store.lockControl(CONTROL)).thenReturn(pending);

    // When
    List<Control> result = service.request(OPERATOR, SEASON, 0, Set.of(SOURCE), Set.of());

    // Then
    assertThat(result).containsExactly(pending);
    verify(store, never()).setInitialIntent(any(), any(), any(), any());
  }

  @Test
  @DisplayName("A conflicting pending selection cannot widen the accepted request")
  void refusesConflictingPendingSelection() {
    // Given
    when(seasons.lockCollectionState(SEASON))
        .thenReturn(season(CollectionSeasonStateEnum.PREPARING));
    when(store.sources(SEASON)).thenReturn(List.of(source(SourceValidationStateEnum.QUALIFIED)));
    Control pending = control(Set.of(UUID.fromString("00000000-0000-4000-8000-000000000261")));
    when(store.controls(SEASON)).thenReturn(List.of(pending));
    when(store.lockControl(CONTROL)).thenReturn(pending);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable request =
        () -> service.request(OPERATOR, SEASON, 0, Set.of(SOURCE), Set.of());

    // Then
    assertThatThrownBy(request).isInstanceOf(CollectionConflictException.class);
    verify(store, never()).setInitialIntent(any(), any(), any(), any());
  }

  /**
   * Supplies only the canonical lifecycle decisive for this scenario.
   *
   * @param state scenario's acquisition lifecycle
   * @return immutable canonical season
   */
  private CollectionSeasonView season(CollectionSeasonStateEnum state) {
    return new CollectionSeasonView(SEASON, "2023/2024", 2023, state, 0);
  }

  /**
   * Supplies actual qualified or confirmation-required immutable reference values.
   *
   * @param validation scenario's current qualification
   * @return unlaunched source without assumed evidence
   */
  private Source source(SourceValidationStateEnum validation) {
    return Source.builder()
        .id(SOURCE)
        .seasonId(SEASON)
        .provider(CollectionProviderEnum.FFVB)
        .organizerReference("ABCCS")
        .candidateUrl("https://www.ffvb.org/archive")
        .validationState(validation)
        .build();
  }

  /**
   * Retains exactly one backend-authorized pending initial selection.
   *
   * @param selected exact roots already accepted into pending intent
   * @return disabled control retaining that one request
   */
  private Control control(Set<UUID> selected) {
    return new Control(
        CONTROL,
        SEASON,
        CollectionFamilyEnum.FFVB,
        0,
        false,
        UUID.fromString("00000000-0000-4000-8000-000000000262"),
        CollectionModeEnum.INITIAL_IMPORT,
        null,
        null,
        null,
        null,
        selected,
        Set.of());
  }
}
