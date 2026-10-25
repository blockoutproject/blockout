package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Current-owner reads and writes through the application-owned external port. */
@DisplayName("Search projection orchestration")
class ProjectSearchTest {
  private final ReadSportingData sporting = mock(ReadSportingData.class);
  private final SearchProjectionWriter writer = mock(SearchProjectionWriter.class);
  private final ProjectSearch projection = new ProjectSearch(sporting, writer);

  @Test
  @DisplayName("Writes current inputs while removing newly ineligible dependent identities")
  void updatesCurrentDependents() {
    // Given
    UUID club = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID hidden = UUID.fromString("00000000-0000-4000-8000-000000000002");
    Set<Scope> changed = Set.of(new Scope(SportingProjectionChanges.Kind.CLUB, club));
    when(sporting.projectionDependents(changed))
        .thenReturn(
            Set.of(
                new Scope(SportingProjectionChanges.Kind.CLUB, club),
                new Scope(SportingProjectionChanges.Kind.TEAM, hidden)));
    when(sporting.publicInputs(Kind.CLUB, Set.of(club)))
        .thenReturn(List.of(club(club, "Current name")));

    // When
    projection.update(changed);

    // Then
    ArgumentCaptor<List<SearchDocuments>> documents = ArgumentCaptor.captor();
    verify(writer)
        .update(
            org.mockito.ArgumentMatchers.eq(Kind.CLUB),
            org.mockito.ArgumentMatchers.eq(Set.of(club)),
            documents.capture());
    assertThat(documents.getValue())
        .singleElement()
        .satisfies(
            document -> {
              assertThat(document.id()).isEqualTo(club);
              assertThat(document.names()).containsExactly("Current name");
            });
    verify(writer).update(Kind.TEAM, Set.of(hidden), List.of());
  }

  @Test
  @DisplayName(
      "Traverses more than one bounded owner page before publishing the complete generation")
  void traversesBoundedPages() {
    // Given
    Map<Kind, String> generation =
        Map.of(Kind.CLUB, "clubs-new", Kind.TEAM, "teams-new", Kind.POOL, "pools-new");
    when(writer.createGeneration()).thenReturn(generation);
    List<SportingPublicInput> clubs =
        java.util.stream.IntStream.rangeClosed(1, 201)
            .mapToObj(position -> club(new UUID(0, position), "Club " + position))
            .toList();
    when(sporting.projectionInputs(Kind.CLUB, 0, 200)).thenReturn(clubs.subList(0, 200));
    when(sporting.projectionInputs(Kind.CLUB, 1, 200)).thenReturn(clubs.subList(200, 201));

    // When
    projection.rebuild();

    // Then
    ArgumentCaptor<List<SearchDocuments>> batches = ArgumentCaptor.captor();
    verify(writer, org.mockito.Mockito.times(2))
        .write(org.mockito.ArgumentMatchers.eq("clubs-new"), batches.capture());
    assertThat(batches.getAllValues()).extracting(List::size).containsExactly(200, 1);
    assertThat(batches.getAllValues().stream().flatMap(List::stream).map(SearchDocuments::id))
        .containsExactlyElementsOf(clubs.stream().map(SportingPublicInput::id).toList());
    verify(writer).publish(generation);
    verify(writer).cleanup();
  }

  @Test
  @DisplayName("Preserves temporary generations after an unconfirmed full run")
  void preservesFailedGeneration() {
    // Given
    Map<Kind, String> generation =
        Map.of(Kind.CLUB, "clubs-new", Kind.TEAM, "teams-new", Kind.POOL, "pools-new");
    when(writer.createGeneration()).thenReturn(generation);
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    when(sporting.projectionInputs(Kind.CLUB, 0, 200)).thenReturn(List.of(club(id, "Club")));
    doThrow(new SearchUnavailableException()).when(writer).write(any(), any());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable rebuild = projection::rebuild;

    // Then
    assertThatThrownBy(rebuild).isInstanceOf(SearchUnavailableException.class);
    verify(writer, org.mockito.Mockito.never()).cleanup();
    verify(writer, org.mockito.Mockito.never()).publish(any());
  }

  /**
   * Creates the minimal public club projection without private contact inputs.
   *
   * @param id scenario identity
   * @param name current public label
   * @return eligible club input
   */
  private SportingPublicInput club(UUID id, String name) {
    return new SportingPublicInput(
        id, Kind.CLUB, null, name, name, null, Set.of(), null, null, Set.of(), null, null, null,
        List.of());
  }
}
