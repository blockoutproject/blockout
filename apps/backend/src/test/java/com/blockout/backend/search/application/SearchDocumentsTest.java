package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Verifies permitted document inputs rather than duplicating owner identity or visibility rules.
 */
@DisplayName("Current sporting search documents")
class SearchDocumentsTest {
  @ParameterizedTest
  @CsvSource({"FEMALE,féminin", "MALE,masculin", "MIXED,mixte"})
  @DisplayName("Projects current names and French classification without fabricating club context")
  void projectsOwnerInputs(SportGenderEnum gender, String label) {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000002");
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000003");
    SportingPublicInput input =
        new SportingPublicInput(
            id,
            Kind.TEAM,
            season,
            "Source Eagles",
            "Public Eagles",
            "Eagles",
            Set.of(
                new SportingPublicInput.Alias(
                    season, "qualified-organizer", "qualified-competition", "verified eagles")),
            new SportingClassification(division, SportFormatEnum._6X6, gender),
            "Nationale Deux",
            Set.of("N2"),
            null,
            null,
            null,
            List.of());

    // When
    SearchDocuments document = SearchDocuments.from(input);

    // Then
    assertThat(document.id()).isEqualTo(id);
    assertThat(document.names())
        .containsExactlyInAnyOrder("Source Eagles", "Public Eagles", "Eagles", "verified eagles");
    assertThat(document.context()).containsExactlyInAnyOrder("Nationale Deux", "N2", "6x6", label);
    assertThat(document.city()).isNull();
    assertThat(document.seasonId()).isEqualTo(season);
    assertThat(document.divisionId()).isEqualTo(division);
    assertThat(document.format()).isEqualTo("6x6");
    assertThat(document.gender()).isEqualTo(gender.getValue());
  }
}
