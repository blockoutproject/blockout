package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real F02 persistence and transaction boundaries with synthetic accepted facts and a controlled
 * PDF port.
 */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Current SQL match documents and HTTP isolation")
class MatchDocumentsIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadMatchDocument documents;
  @Autowired private ReadSportingResources resources;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private MatchDocumentSource source;
  private MatchView match;

  /**
   * Creates current F02 identities, then declares explicitly synthetic accepted reference/schedule
   * values.
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    Scope scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    match =
        identities.identifyMatch(
            scope.pool(),
            "DOC259",
            new TeamCandidate(null, "Home", "00259", "Home club"),
            new TeamCandidate(null, "Away", "00260", "Away club"));
    sql.update(
        "UPDATE sporting_match SET local_date='2026-10-24', schedule_observed_at='2026-10-20T12:00:00Z', document_season_label='2026/2027', document_organizer_reference='TEST', document_match_code='EXACT259', scoresheet_url='https://documents.example.invalid/score.pdf' WHERE id=?",
        match.id());
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?fixture=259' WHERE id=?",
        match.poolId());
  }

  @Test
  @DisplayName(
      "Projects accepted references while final result withdrawal immediately removes result documents")
  void projectsCurrentReferences() {
    // Given
    sql.update(
        "UPDATE sporting_match SET result_state='FINAL',home_sets=3,away_sets=1,result_observed_at='2026-10-24T20:00:00Z' WHERE id=?",
        match.id());

    // When
    ConsultationViews.MatchDetail finalDetail = resources.match(match.id());
    sql.update(
        "UPDATE sporting_match SET result_state=NULL,home_sets=NULL,away_sets=NULL WHERE id=?",
        match.id());
    ConsultationViews.MatchDetail withdrawn = resources.match(match.id());

    // Then
    assertThat(finalDetail.documents())
        .extracting(ConsultationViews.Document::kind)
        .containsExactly(MatchDocumentKindEnum.INFORMATION, MatchDocumentKindEnum.SCORESHEET);
    assertThat(finalDetail.officialCalendarUrl())
        .hasToString("https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?fixture=259");
    assertThat(withdrawn.documents())
        .extracting(ConsultationViews.Document::kind)
        .containsExactly(MatchDocumentKindEnum.INFORMATION);
    assertThatThrownBy(() -> documents.read(match.id(), MatchDocumentKindEnum.SCORESHEET))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Closes the reference read and suspends an ambient transaction before HTTP")
  void fetchesOutsideSql() {
    // Given
    byte[] pdf = new byte[] {1, 2, 3};
    when(source.fetch(any()))
        .thenAnswer(
            invocation -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              MatchDocumentSource.Reference reference = invocation.getArgument(0);
              assertThat(reference.informationSheet().matchCode()).isEqualTo("EXACT259");
              return pdf;
            });
    TransactionTemplate outer = new TransactionTemplate(transactions);

    // When
    List<byte[]> received =
        outer.execute(
            status -> {
              byte[] result = documents.read(match.id(), MatchDocumentKindEnum.INFORMATION);
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
              return List.of(result);
            });

    // Then
    assertThat(received).containsExactly(pdf);
  }

  @Test
  @DisplayName("Refuses dateless retained references without inferring provider withdrawal")
  void refusesDatelessReference() {
    // Given
    sql.update("UPDATE sporting_match SET local_date=NULL WHERE id=?", match.id());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> documents.read(match.id(), MatchDocumentKindEnum.INFORMATION);

    // Then
    assertThatThrownBy(read).isInstanceOf(SportingResourceNotFoundException.class);
    assertThat(
            sql.queryForObject(
                "SELECT document_match_code FROM sporting_match WHERE id=?",
                String.class,
                match.id()))
        .isEqualTo("EXACT259");
  }
}
