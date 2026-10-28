package com.blockout.backend.contributions.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Actual submitted versions and F03 generated projection under current PostgreSQL visibility. */
@DisplayName("Public contributed stream projection")
class PublicContributionIntegrationTest extends ContributionScenario {
  @Autowired private ReadSportingResources consultation;
  @Autowired private ConsultationApiMapper publicMapper;

  @Test
  @DisplayName("Publishes only the exact active version and address through F03")
  void publishesExactActiveVersion() {
    // Given
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/active", false);
    result(2, ResultStateEnum.FINAL);
    SubmitContribution.Outcome pending = submit(AUTHOR, "1", "https://youtu.be/pending", false);

    // When
    com.blockout.backend.generated.mobile.model.MatchDetailResponse response =
        publicMapper.toDto(consultation.match(matchId));

    // Then
    assertThat(response.getStreamUrl().toString()).isEqualTo(active.version().address().value());
    assertThat(response.getStreamContributionId()).isEqualTo(active.version().id());
    assertThat(response.getStreamContributionId()).isNotEqualTo(pending.version().id());
  }

  @Test
  @DisplayName("Keeps an initial pending proposal outside the public match")
  void hidesPendingOnlyVersion() {
    // Given
    result(2, ResultStateEnum.FINAL);
    submit(AUTHOR, "0", "https://youtu.be/pending", false);

    // When
    com.blockout.backend.generated.mobile.model.MatchDetailResponse response =
        publicMapper.toDto(consultation.match(matchId));

    // Then
    assertThat(response.getStreamUrl()).isNull();
    assertThat(response.getStreamContributionId()).isNull();
  }

  @Test
  @DisplayName("Current match withdrawal hides an already contributed link")
  void hidesWithdrawnMatchLink() {
    // Given
    submit(AUTHOR, "0", "https://youtu.be/active", false);
    sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);

    // When / Then
    assertThatThrownBy(() -> consultation.match(matchId))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }
}
