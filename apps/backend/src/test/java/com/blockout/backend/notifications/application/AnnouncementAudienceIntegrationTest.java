package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import java.sql.Timestamp;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Real producer and follow transactions; the spy controls when an independent follow commits. */
@DisplayName("Single announcement audience on PostgreSQL")
class AnnouncementAudienceIntegrationTest extends ContributionScenario {

  @Autowired private ProcessDueLinkAnnouncements.ProcessDueMatch dueMatch;
  @MockitoSpyBean private ReadFollowEligibility eligibility;

  @ParameterizedTest(name = "{0} preserves its selected audience")
  @ValueSource(strings = {"publication", "result", "due"})
  @DisplayName("A new follow after selection neither aborts the producer nor expands its audience")
  void preservesSelectedAudience(String producer) {
    // Given
    if (producer.equals("due")) {
      sql.update(
          "UPDATE sporting_match SET reliable_start=? WHERE id=?",
          Timestamp.from(NOW.plusSeconds(60)),
          matchId);
      submit(AUTHOR, "0", "https://youtube.com/advance", false);
      when(clock.instant()).thenReturn(NOW.plusSeconds(90));
    }
    follow(FOLLOWER);
    AtomicBoolean added = new AtomicBoolean();
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    doAnswer(
            invocation -> {
              Object selected = invocation.callRealMethod();
              if (added.compareAndSet(false, true)) {
                independent.executeWithoutResult(status -> follow(OTHER));
              }
              return selected;
            })
        .when(eligibility)
        .recipients(anySet());

    // When
    switch (producer) {
      case "publication" -> submit(AUTHOR, "0", "https://youtube.com/live", false);
      case "result" -> result(2, ResultStateEnum.FINAL);
      case "due" -> dueMatch.process(matchId);
      default -> throw new IllegalArgumentException(producer);
    }

    // Then
    assertThat(sql.queryForList("SELECT account_id FROM notification", UUID.class))
        .containsExactly(FOLLOWER);
    assertThat(sql.queryForList("SELECT account_id FROM pool_follow", UUID.class))
        .containsExactlyInAnyOrder(FOLLOWER, OTHER);
    assertThat(count("match_announcement")).isEqualTo(1);
  }

  @ParameterizedTest(name = "{0} does not select followers")
  @ValueSource(strings = {"pending", "unchanged", "consumed"})
  @DisplayName("A submission without a new announcement does no audience work")
  void skipsUnallocatedAudience(String scenario) {
    // Given
    String first = "https://youtube.com/first";
    if (scenario.equals("pending")) {
      result(2, ResultStateEnum.FINAL);
    } else {
      submit(AUTHOR, "0", first, false);
    }
    clearInvocations(eligibility);

    // When
    SubmitContribution.Outcome outcome =
        submit(
            AUTHOR,
            scenario.equals("pending") ? "0" : "1",
            scenario.equals("unchanged") ? first : "https://youtube.com/replacement",
            false);

    // Then
    verifyNoInteractions(eligibility);
    assertThat(outcome.created()).isEqualTo(!scenario.equals("unchanged"));
    assertThat(count("contribution_version")).isEqualTo(scenario.equals("consumed") ? 2 : 1);
    assertThat(count("notification")).isZero();
  }
}
