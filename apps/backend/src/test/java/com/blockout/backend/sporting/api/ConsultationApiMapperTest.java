package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentResponse;
import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.sporting.application.ConsultationViews.Division;
import com.blockout.backend.sporting.application.ConsultationViews.Document;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mapstruct.factory.Mappers;

/** Verifies handwritten consultation mapping without starting JSON or validation infrastructure. */
@DisplayName("Consultation response mapping")
class ConsultationApiMapperTest {
  private final ConsultationApiMapper mapper = Mappers.getMapper(ConsultationApiMapper.class);

  @ParameterizedTest
  @EnumSource(MatchDocumentKindEnum.class)
  @DisplayName("Preserves each document kind with its backend resource URL")
  void mapsDocument(MatchDocumentKindEnum kind) {
    // Given
    String url = "/matches/00000000-0000-4000-8000-000000000001/documents/" + kind.getValue();
    Document document = new Document(kind, url);

    // When
    MatchDocumentResponse response = mapper.toDto(document);

    // Then
    assertThat(response.getKind()).isEqualTo(kind);
    assertThat(response.getUrl()).isEqualTo(url);
  }

  @Test
  @DisplayName("Preserves the three configured gradient colors in their original order")
  void preservesGradient() {
    // Given
    Division division =
        new Division(
            UUID.fromString("00000000-0000-4000-8000-000000000001"),
            "Division",
            null,
            "#112233",
            List.of("#112233", "#223344", "#334455"));

    // When
    SportingDivisionResponse response = mapper.toDto(division);

    // Then
    assertThat(response.getGradient().get()).containsExactly("#112233", "#223344", "#334455");
  }
}
