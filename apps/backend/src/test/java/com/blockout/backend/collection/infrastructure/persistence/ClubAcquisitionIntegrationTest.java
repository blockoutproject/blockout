package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.service.ClubDetailsService;
import com.blockout.backend.sporting.application.service.ClubLocalityService;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Controlled-clock F01 admission/results use actual migrated F02 corrections and restrictions. */
@SpringBootTest
@Testcontainers
@DisplayName("Current seasonless club acquisition")
class ClubAcquisitionIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000197");
  private static final UUID SHEETS = UUID.fromString("00000000-0000-4000-8000-000000001197");
  private static final UUID GEOCODING = UUID.fromString("00000000-0000-4000-8000-000000002197");
  private static final Instant START = Instant.parse("2026-10-25T10:00:00Z");
  @MockitoBean private Clock clock;
  @Autowired private JdbcTemplate sql;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectionResultService results;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private ClubDetailsService details;
  @Autowired private ClubLocalityService localities;
  @Autowired private SportingReadService reads;
  @Autowired private AccountStore accounts;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private SeasonService seasons;
  @Autowired private SportingIdentityService identities;
  private UUID account;
  private Instant now;

  /**
   * Migrates the disposable PostgreSQL owner, never a shared environment.
   *
   * @param properties native isolated datasource settings
   * @throws Exception when the real migration cannot initialize this suite
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Establishes two independent seasonless controls and a real correction-authorized account.
   *
   * @throws Exception when the isolated fixture reset fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    now = START;
    when(clock.instant()).thenAnswer(invocation -> now);
    SportingIngestionFixture.reset(DATABASE);
    sql.update("DELETE FROM collection_control");
    sql.update("DELETE FROM account");
    SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    sql.update(
        "INSERT INTO sporting_club(id,provider,reference,source_name) VALUES (?,'FFVB','000042','Synthetic club')",
        CLUB);
    sql.update(
        "INSERT INTO collection_control(id,family,enabled) VALUES (?,'CLUB_SHEETS',TRUE),(?,'GEOCODING',TRUE)",
        SHEETS,
        GEOCODING);
    account =
        new TransactionTemplate(transactions)
            .execute(
                status ->
                    accounts
                        .create(
                            "https://identity.example.invalid/",
                            "auth0|issue197",
                            "Operator_197",
                            "operator@example.invalid",
                            null)
                        .id());
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'sporting-presentation.manage')",
        account);
  }

  @ParameterizedTest
  @EnumSource(
      value = GeocodingOutcomeEnum.class,
      names = {"EMPTY", "AMBIGUOUS"})
  @DisplayName("A failed manual retry of an old normal no-result becomes ordinarily eligible")
  void retriesTechnicalFailureAfterNormalResult(GeocodingOutcomeEnum outcome) {
    // Given
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    localities.accept(
        CLUB,
        new SportingPresentation.LocalityObservation(
            context(first), targets(first).getFirst().localityRevision(), outcome, null, null));
    record(first, CollectionStageEnum.GEOCODING, CollectionOutcomeEnum.SUCCESS);
    results.complete(first.id(), now);
    now = START.plus(Duration.ofMinutes(10));
    CollectionState.Cycle manual = admit(GEOCODING, true);
    record(manual, CollectionStageEnum.GEOCODING, CollectionOutcomeEnum.FAILED);
    results.complete(manual.id(), now);

    // A whole earlier page of suppressed normal results must not hide the later failed club.
    for (int index = 1; index <= 200; index++) {
      sql.update(
          "INSERT INTO sporting_club(id,provider,reference,municipality,locality_revision,geocoded_revision) VALUES (?,'FFVB',?,'Paris',1,1)",
          new UUID(0, index),
          "SUPPRESSED-" + index);
    }

    // When
    now = now.plus(Duration.ofHours(1));
    CollectionState.Cycle retry = admit(GEOCODING, false);

    // Then
    assertThat(targets(retry)).extracting(item -> item.target().clubId()).containsExactly(CLUB);
    String revision = targets(retry).getFirst().localityRevision();
    localities.accept(
        CLUB,
        new SportingPresentation.LocalityObservation(
            context(retry), revision, GeocodingOutcomeEnum.EMPTY, null, null));
    record(retry, CollectionStageEnum.GEOCODING, CollectionOutcomeEnum.SUCCESS);
    results.complete(retry.id(), now);
    now = now.plus(Duration.ofDays(1));
    assertThat(targets(admit(GEOCODING, false))).isEmpty();
  }

  @Test
  @DisplayName(
      "Invalid secondary source fields emit a safe diagnostic while retaining usable state")
  void reportsInvalidSecondaryField() {
    // Given
    CollectionState.Cycle sheets = admit(SHEETS, false);
    details.accept(
        CLUB,
        new SportingPresentation.ClubObservation(
            context(sheets),
            null,
            Map.of(ContactField.EMAIL, JsonNullable.of("valid@example.invalid"))));

    // When
    ObservationOutcome outcome =
        details.accept(
            CLUB,
            new SportingPresentation.ClubObservation(
                new MatchObservation.Context(
                    sheets.id(), 2, OffsetDateTime.ofInstant(now, ZoneOffset.UTC), null),
                "Updated synthetic name",
                Map.of(ContactField.EMAIL, JsonNullable.of("invalid-email"))));

    // Then
    assertThat(outcome.outcome()).isEqualTo(ObservationOutcomeEnum.ACCEPTED);
    assertThat(outcome.reasonType()).hasToString("urn:blockout:problem:unprocessable-content");
    assertThat(details.get(account, CLUB).fields().get(ContactField.EMAIL).sourceValue())
        .isEqualTo("valid@example.invalid");
    assertThat(reads.club(CLUB).orElseThrow().sourceName()).isEqualTo("Updated synthetic name");
  }

  @Test
  @DisplayName("Attempts a discovered club immediately then exactly after 24 hours")
  void respectsDailySheetCadence() {
    // Given
    CollectionState.Cycle first = admit(SHEETS, false);
    assertThat(targets(first))
        .extracting(item -> item.target().clubReference())
        .containsExactly("000042");
    record(first, CollectionStageEnum.CLUB_SHEET, CollectionOutcomeEnum.FAILED);
    results.complete(first.id(), now);
    now = START.plus(Duration.ofDays(1)).minusSeconds(1);
    CollectionState.Cycle early = admit(SHEETS, false);
    assertThat(targets(early)).isEmpty();
    results.complete(early.id(), now);

    // When
    now = START.plus(Duration.ofDays(1));
    CollectionState.Cycle next = admit(SHEETS, false);

    // Then
    assertThat(targets(next)).extracting(item -> item.target().clubId()).containsExactly(CLUB);
    assertThat(reads.club(CLUB).orElseThrow().sourceName()).isEqualTo("Synthetic club");
  }

  @ParameterizedTest
  @EnumSource(
      value = GeocodingOutcomeEnum.class,
      names = {"EMPTY", "AMBIGUOUS"})
  @DisplayName("Suppresses unchanged normal no-results until an explicit unresolved-only rerun")
  void suppressesUnresolvedLocality(GeocodingOutcomeEnum outcome) {
    // Given
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    CollectionState.ServedTarget target = targets(first).getFirst();
    localities.accept(
        CLUB,
        new SportingPresentation.LocalityObservation(
            context(first), target.localityRevision(), outcome, null, null));
    record(first, CollectionStageEnum.GEOCODING, CollectionOutcomeEnum.SUCCESS);
    results.complete(first.id(), now);
    now = START.plus(Duration.ofDays(2));
    CollectionState.Cycle ordinary = admit(GEOCODING, false);
    assertThat(targets(ordinary)).isEmpty();
    results.complete(ordinary.id(), now);

    // When
    CollectionState.Cycle manual = admit(GEOCODING, true);

    // Then
    assertThat(targets(manual)).extracting(item -> item.target().clubId()).containsExactly(CLUB);
  }

  @Test
  @DisplayName("A manual rerun never recalculates an accepted municipal point")
  void excludesValidPoints() {
    // Given
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    localities.accept(
        CLUB,
        new SportingPresentation.LocalityObservation(
            context(first),
            targets(first).getFirst().localityRevision(),
            GeocodingOutcomeEnum.LOCATED,
            48.86,
            2.34));
    results.complete(first.id(), now);

    // When
    CollectionState.Cycle manual = admit(GEOCODING, true);

    // Then
    assertThat(targets(manual)).isEmpty();
    assertThat(reads.publicLocality(CLUB).orElseThrow().latitude()).isEqualTo(48.86);
  }

  @Test
  @DisplayName("A technical failure remains eligible at the next ordinary hour")
  void retriesTechnicalFailureNormally() {
    // Given
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    record(first, CollectionStageEnum.GEOCODING, CollectionOutcomeEnum.FAILED);
    results.complete(first.id(), now);
    now = START.plus(Duration.ofMinutes(59));
    CollectionState.Cycle early = admit(GEOCODING, false);
    assertThat(targets(early)).isEmpty();
    results.complete(early.id(), now);

    // When
    now = START.plus(Duration.ofHours(1));
    CollectionState.Cycle next = admit(GEOCODING, false);

    // Then
    assertThat(targets(next)).hasSize(1);
  }

  @Test
  @DisplayName("Only an effective municipality or postal change creates another unresolved need")
  void tracksEffectiveLocality() {
    // Given
    correct(
        Map.of(
            ContactField.CITY,
            new ContactEdit(ContactModeEnum.MANUAL, "Paris"),
            ContactField.POSTAL_CODE,
            new ContactEdit(ContactModeEnum.MANUAL, "75001")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    String revision = targets(first).getFirst().localityRevision();
    localities.accept(
        CLUB,
        new SportingPresentation.LocalityObservation(
            context(first), revision, GeocodingOutcomeEnum.EMPTY, null, null));
    results.complete(first.id(), now);
    correct(
        Map.of(ContactField.ADDRESS, new ContactEdit(ContactModeEnum.MANUAL, "Synthetic street")));
    assertThat(reads.publicLocality(CLUB).orElseThrow().revision()).isEqualTo(revision);
    CollectionState.Cycle unchanged = admit(GEOCODING, false);
    assertThat(targets(unchanged)).isEmpty();
    results.complete(unchanged.id(), now);

    // When
    correct(Map.of(ContactField.POSTAL_CODE, new ContactEdit(ContactModeEnum.MANUAL, "75015")));
    now = START.plus(Duration.ofMinutes(1));
    CollectionState.Cycle changed = admit(GEOCODING, false);

    // Then
    assertThat(targets(changed))
        .singleElement()
        .satisfies(
            item -> {
              assertThat(item.postalCode()).isEqualTo("75015");
              assertThat(item.localityRevision()).isNotEqualTo(revision);
            });
  }

  @Test
  @DisplayName(
      "Targets resolve current corrections and restrictions after admission, rejecting late results")
  void currentLocalityWins() {
    // Given
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle first = admit(GEOCODING, false);
    String revision = targets(first).getFirst().localityRevision();
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Lyon")));
    assertThat(targets(first).getFirst().municipality()).isEqualTo("Lyon");

    // When
    ObservationOutcomeEnum late =
        localities
            .accept(
                CLUB,
                new SportingPresentation.LocalityObservation(
                    context(first), revision, GeocodingOutcomeEnum.LOCATED, 48.86, 2.34))
            .outcome();
    details.restrict(CLUB, Set.of(ContactField.CITY));

    // Then
    assertThat(late).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(targets(first).getFirst().municipality()).isNull();
    assertThat(targets(first).getFirst().postalCode()).isNull();
    assertThat(reads.publicLocality(CLUB).orElseThrow().latitude()).isNull();
  }

  @Test
  @DisplayName("Newly permitted locality is selected on the minute passage independently of sheets")
  void discoversNewNeedWithinHour() {
    // Given
    CollectionState.Cycle empty = admit(GEOCODING, false);
    assertThat(targets(empty)).isEmpty();
    results.complete(empty.id(), now);
    sql.update("UPDATE collection_control SET enabled=FALSE WHERE id=?", SHEETS);
    sql.update("UPDATE sporting_season SET collection_state='CLOSED'");
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));

    // When
    now = START.plus(Duration.ofMinutes(1));
    CollectionState.Cycle next = admit(GEOCODING, false);

    // Then
    assertThat(targets(next)).hasSize(1);
    assertThat(Duration.between(START, next.startedAt())).isLessThan(Duration.ofHours(1));
  }

  /**
   * Admits one ordinary or explicitly requested family cycle using its actual current revision.
   *
   * @param control independent seasonless family control
   * @param manual whether the fixture requests an explicit unresolved-only rerun
   * @return real admitted cycle without supplying provider facts
   */
  private CollectionState.Cycle admit(UUID control, boolean manual) {
    UUID request = manual ? UUID.randomUUID() : null;
    if (manual)
      sql.update(
          "UPDATE collection_control SET request_id=?,requested_mode='MANUAL' WHERE id=?",
          request,
          control);
    long revision =
        sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, control);
    return cycles
        .admit(
            new CollectionState.StartCycle(
                UUID.randomUUID(),
                runtimes.current().incarnationId(),
                control,
                null,
                revision,
                request))
        .cycle();
  }

  /**
   * Reads the real frozen references with F02's currently permitted locality.
   *
   * @param cycle real admitted capability
   * @return first bounded page of current context-qualified targets
   */
  private List<CollectionState.ServedTarget> targets(CollectionState.Cycle cycle) {
    return cycles.targets(cycle.id(), 0, 50).items();
  }

  /**
   * Applies a real atomic F02 correction at its current contact revision.
   *
   * @param fields scenario-owned desired independent modes and values
   */
  private void correct(Map<ContactField, ContactEdit> fields) {
    details.correct(account, CLUB, Long.toString(details.get(account, CLUB).revision()), fields);
  }

  /**
   * Attributes one actual F02 result without a fabricated source publication time.
   *
   * @param cycle admitted owner of this observation
   * @return first read ordinal at the controlled instant
   */
  private MatchObservation.Context context(CollectionState.Cycle cycle) {
    return new MatchObservation.Context(
        cycle.id(), 1, OffsetDateTime.ofInstant(now, ZoneOffset.UTC), null);
  }

  /**
   * Records a measured acquisition attempt; technical failures deliberately submit no locality.
   *
   * @param cycle real running control passage
   * @param stage actual club-sheet or geocoding stage
   * @param outcome measured acquisition outcome
   */
  private void record(
      CollectionState.Cycle cycle, CollectionStageEnum stage, CollectionOutcomeEnum outcome) {
    results.record(
        cycle.id(),
        new RecordCollectionResult(
            CLUB, stage, CollectionPhaseEnum.ACQUISITION, 1, now, outcome, null, null, null, null));
  }
}
