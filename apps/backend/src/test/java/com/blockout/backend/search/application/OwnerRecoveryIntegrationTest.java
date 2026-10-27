package com.blockout.backend.search.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.MarkNotificationRead;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.PurgeNotifications.DeleteExpiredEntries;
import com.blockout.backend.search.infrastructure.OpenSearchEngine;
import com.blockout.backend.search.infrastructure.OpenSearchProjectionWriter;
import com.blockout.backend.search.infrastructure.SearchIndexProperties;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * Ordinary F04 reconstruction over real F01-admitted F02/F08 producers and F07 retained facts.
 * PostgreSQL and TLS OpenSearch are disposable; only the inherited clock is controlled.
 */
@Import(OwnerRecoveryIntegrationTest.ProjectionConfiguration.class)
@DisplayName("Ordinary cross-owner recovery preserves consumed announcements")
class OwnerRecoveryIntegrationTest extends ContributionScenario {
  private static final String PREFIX = "blockout-local-search-issue248";
  @Autowired private ProjectSearch projection;
  @Autowired private SearchTestEngine engine;
  @Autowired private MarkNotificationRead marks;
  @Autowired private DeleteExpiredEntries retention;

  @Test
  @DisplayName("Missing initial aliases are unavailable instead of an empty completed search")
  void refusesMissingInitialGeneration() {
    // Given
    OpenSearchEngine unpublished =
        new OpenSearchEngine(engine.client, new SearchIndexProperties(PREFIX + "-unpublished"));
    SearchContext context =
        new SearchContext(SearchContext.Resource.POOL, "synthetic", null, null, null, null, false);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable search =
        () -> unpublished.search(context, null, 20);

    // Then
    assertThatThrownBy(search).isInstanceOf(SearchUnavailableException.class);
  }

  @Test
  @DisplayName(
      "A later ordinary calendar preserves the identities committed before partial failure")
  void recoversPartialCalendar() {
    // Given
    LocalDate corrected = LocalDate.of(2026, 10, 25);
    ObservationOutcome.Calendar partial =
        calendars.accept(
            scope.pool(),
            new CalendarObservation(
                context(2),
                true,
                List.of(
                    candidate("M2", "Home", corrected), candidate("M1", "Replacement", corrected)),
                List.of(),
                List.of()));
    assertThat(partial.acceptedCount()).isEqualTo(1);
    assertThat(partial.rejectedCount()).isEqualTo(1);
    assertThat(partial.absenceReconciled()).isFalse();
    UUID acceptedId =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M2'", UUID.class);
    List<UUID> teams = sql.queryForList("SELECT id FROM sporting_team ORDER BY id", UUID.class);
    assertThat(
            sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE id=?", LocalDate.class, matchId))
        .isEqualTo(LocalDate.of(2026, 10, 24));

    // When
    ObservationOutcome.Calendar recovered =
        calendars.accept(
            scope.pool(),
            new CalendarObservation(
                context(3),
                true,
                List.of(candidate("M2", "Home", corrected), candidate("M1", "Home", corrected)),
                List.of(),
                List.of()));

    // Then
    assertThat(recovered.rejectedCount()).isZero();
    assertThat(recovered.absenceReconciled()).isTrue();
    assertThat(sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class))
        .isEqualTo(matchId);
    assertThat(sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M2'", UUID.class))
        .isEqualTo(acceptedId);
    assertThat(sql.queryForList("SELECT id FROM sporting_team ORDER BY id", UUID.class))
        .isEqualTo(teams);
    assertThat(sql.queryForList("SELECT local_date FROM sporting_match", LocalDate.class))
        .containsExactlyInAnyOrder(corrected, corrected);
  }

  @Test
  @DisplayName("Search rebuilds preserve read entries and cannot recreate purged announcements")
  void preservesConsumedAnnouncements() throws Exception {
    // Given
    follow(FOLLOWER);
    submit(AUTHOR, "0", "https://youtube.com/live", false);
    result(2, ResultStateEnum.FINAL);
    List<UUID> entries = sql.queryForList("SELECT id FROM notification", UUID.class);
    assertThat(entries).hasSize(2);
    for (UUID entry : entries) marks.mark(new NotificationContext(FOLLOWER), entry);
    Map<String, Object> facts =
        sql.queryForMap("SELECT * FROM match_announcement WHERE match_id=?", matchId);
    assertThat(facts)
        .containsEntry("live_processed", true)
        .containsEntry("result_processed", true)
        .containsEntry("post_result_processed", true);
    List<Map<String, Object>> personal = sql.queryForList("SELECT * FROM notification ORDER BY id");
    Map<String, Object> accepted =
        sql.queryForMap("SELECT * FROM sporting_match WHERE id=?", matchId);

    // When
    projection.rebuild();
    projection.rebuild();

    // Then
    assertThat(
            engine
                .client
                .exists(request -> request.index(PREFIX + "-pools").id(scope.pool().toString()))
                .value())
        .isTrue();
    assertThat(sql.queryForList("SELECT * FROM notification ORDER BY id")).isEqualTo(personal);
    assertThat(sql.queryForMap("SELECT * FROM sporting_match WHERE id=?", matchId))
        .isEqualTo(accepted);
    assertThat(sql.queryForMap("SELECT * FROM match_announcement WHERE match_id=?", matchId))
        .isEqualTo(facts);

    // When: the actual purge transaction removes allocations at the explicit inclusive cutoff.
    assertThat(retention.delete(NOW).deleted()).isEqualTo(2);
    follow(OTHER);
    projection.rebuild();
    result(3, null);
    result(4, ResultStateEnum.FINAL);
    due.run();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(sql.queryForMap("SELECT * FROM match_announcement WHERE match_id=?", matchId))
        .isEqualTo(facts);
    assertThat(sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class))
        .isEqualTo(matchId);
  }

  /** Reuses the existing native fixture and production owner without a second background writer. */
  @TestConfiguration(proxyBeanMethods = false)
  static class ProjectionConfiguration {
    /**
     * Starts one context-owned engine and closes it even when initialization fails.
     *
     * @return existing disposable TLS fixture
     */
    @Bean(initMethod = "startEngine", destroyMethod = "close")
    SearchTestEngine recoveryEngine() {
      return new SearchTestEngine();
    }

    /**
     * Keeps all generation writes inside this suite's explicit native namespace.
     *
     * @param engine context-owned real OpenSearch fixture
     * @return production generation writer
     */
    @Bean
    SearchProjectionWriter recoveryWriter(SearchTestEngine engine) {
      return new OpenSearchProjectionWriter(engine.client, new SearchIndexProperties(PREFIX));
    }

    /**
     * Invokes the actual transactional owner; scheduler interruption has its own F04 suite.
     *
     * @param sporting current real F02 reads
     * @param writer production native writer
     * @return Spring-proxied reconstruction owner
     */
    @Bean
    ProjectSearch recoveryProjection(ReadSportingData sporting, SearchProjectionWriter writer) {
      return new ProjectSearch(sporting, writer);
    }
  }
}
