package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.sporting.application.ConsultationViews.Division;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Verifies handwritten consultation mapping without starting JSON or validation infrastructure. */
@DisplayName("Consultation response mapping")
class ConsultationApiMapperTest {
  private final ConsultationApiMapper mapper = Mappers.getMapper(ConsultationApiMapper.class);

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
