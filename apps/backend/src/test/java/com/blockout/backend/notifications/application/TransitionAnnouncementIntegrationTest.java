package com.blockout.backend.notifications.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.service.AcceptSourceValidation;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.InitialReconstructionService;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real F01/F02/F06/F07 transactions and local sending with fictional V2 accounts and source facts.
 * Only time, worker execution and the external push provider are controlled; no V1 state is read.
 */
@SpringBootTest(
    properties = {
      "blockout.notifications.push.enabled=true",
      "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000001",
      "blockout.notifications.push.access-token=synthetic-not-a-credential",
      "blockout.notifications.retention-cron=-",
      "blockout.notifications.link-announcements-cron=-"
    })
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@RecordApplicationEvents
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Silent reconstruction through the actual announcement owners")
class TransitionAnnouncementIntegrationTest {
  private static final UUID OPERATOR = UUID.fromString("00000000-0000-4000-8000-000000000356");
  private static final UUID FOLLOWER = UUID.fromString("00000000-0000-4000-8000-000000000357");
  private static final UUID STARTUP = UUID.fromString("00000000-0000-4000-8000-000000000358");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000359");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private InitialReconstructionService reconstruction;
  @Autowired private PrepareCollectionSources preparation;
  @Autowired private AcceptSourceValidation validation;
  @Autowired private AdmitCollectionCycle admission;
  @Autowired private RegisterCollectorRuntime runtime;
  @Autowired private ReadCollectionSeasons seasons;
  @Autowired private ReadCollectionConfiguration configuration;
  @Autowired private ChangeCollectionControls controls;
  @Autowired private RecordCollectionResults results;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptMatchObservation matches;
  @Autowired private SportingObservationMapper mapper;
  @Autowired private FollowState follows;
  @Autowired private ChangePushSubscriptions subscriptions;
  @Autowired private ApplicationEvents events;
  @MockitoBean private Clock clock;
  @MockitoBean private PushProvider provider;

  @MockitoBean(name = "pushExecutor")
  private ThreadPoolTaskExecutor executor;

  private Source source;
  private UUID pool;
  private UUID historicalMatch;
  private UUID laterMatch;
  private Cycle initial;
  private FollowContext follow;

  /**
   * Prepares two known encounters under a real initial request and one voluntary V2 follow.
   * Qualification is controlled source evidence, never proof of live provider availability.
   *
   * @throws Exception when this suite's disposable migrated SQL fixture cannot be prepared
   */
  @BeforeEach
  void prepareInitialPassage() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    SportingIngestionFixture.reset(database);
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement cleanup = connection.createStatement()) {
      cleanup.execute("TRUNCATE account, collection_control, collection_cycle CASCADE");
    }
    for (UUID account : List.of(OPERATOR, FOLLOWER)) {
      sql.update(
          "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', ?, ?, 'synthetic@example.invalid')",
          account,
          account.toString(),
          account.toString().replace("-", ""));
    }
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage')",
        OPERATOR);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic transition',TRUE,'#112233')",
        DIVISION);
    runtime.register(
        sql.queryForObject("SELECT revision FROM collector_runtime WHERE id=1", Long.class),
        STARTUP);
    source = qualifiedSource();
    pool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    source.seasonId(),
                    "ABCCS",
                    "N2",
                    null,
                    null,
                    "P1"),
                "PACK",
                "Synthetic transition pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET setting_division_id=?, setting_format='_6X6', setting_gender='MALE', calendar_url='https://www.ffvbbeach.org/calendar' WHERE id=?",
        DIVISION,
        pool);
    initial = initialCycle();
    calendars.accept(
        pool,
        new CalendarObservation(
            context(initial, 1),
            true,
            List.of(
                candidate("HISTORICAL", "Historical home", LocalDate.of(2026, 10, 24)),
                candidate("LATER", "Later home", LocalDate.of(2026, 10, 25))),
            List.of(),
            List.of()));
    historicalMatch =
        sql.queryForObject(
            "SELECT id FROM sporting_match WHERE reference='HISTORICAL'", UUID.class);
    laterMatch =
        sql.queryForObject("SELECT id FROM sporting_match WHERE reference='LATER'", UUID.class);
    follow = new FollowContext(FOLLOWER, new Target(TargetType.POOL, pool));
    follows.replace(follow, true);
    subscriptions.replace(
        new Registration(
            UUID.fromString("00000000-0000-4000-8000-000000000360"),
            UUID.fromString("00000000-0000-4000-8000-000000000361"),
            FOLLOWER,
            "ExponentPushToken[synthetic-transition]"));
  }

  @Test
  @DisplayName("Initial and repeated results stay silent before a new ordinary result sends once")
  void announcesOnlyLaterEligibleResult() {
    // Given
    result(initial, historicalMatch, 2, 1);
    assertThat(
            sql.queryForObject(
                "SELECT professional_stream_url FROM sporting_match WHERE id=?",
                String.class,
                historicalMatch))
        .isEqualTo("https://example.invalid/source-media");
    assertSilent();
    results.complete(initial.id(), NOW.plusSeconds(60));
    when(clock.instant()).thenReturn(NOW.plusSeconds(120));

    // When: a separate backend-authorized initial passage corrects the historical result.
    Cycle repeated = initialCycle();
    result(repeated, historicalMatch, 1, 2);
    result(repeated, historicalMatch, 2, 2);

    // Then
    assertThat(repeated.mode()).isEqualTo(CollectionModeEnum.INITIAL_IMPORT);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Long.class)).isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                historicalMatch))
        .isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT away_sets FROM sporting_match WHERE id=?", Integer.class, historicalMatch))
        .isEqualTo(2);
    assertSilent();
    results.complete(repeated.id(), NOW.plusSeconds(180));
    Cycle ordinary = ordinaryCycle();
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When: corrections to consumed history and a genuinely later final use the ordinary mode.
    result(ordinary, historicalMatch, 1, 0);
    result(ordinary, laterMatch, 2, 1);
    result(ordinary, laterMatch, 3, 1);
    pending().run();

    // Then
    assertThat(ordinary.mode()).isEqualTo(CollectionModeEnum.MANUAL);
    assertThat(sql.queryForList("SELECT account_id FROM notification", UUID.class))
        .containsExactly(FOLLOWER);
    assertThat(sql.queryForList("SELECT match_id FROM notification", UUID.class))
        .containsExactly(laterMatch);
    assertThat(sql.queryForObject("SELECT is_read FROM notification", Boolean.class)).isFalse();
    assertThat(events.stream(AfterCommitAnnouncements.Ready.class)).hasSize(1);
    ArgumentCaptor<List<Message>> sent = ArgumentCaptor.captor();
    verify(provider).send(sent.capture());
    assertThat(sent.getValue())
        .singleElement()
        .satisfies(
            message -> {
              assertThat(message.ownerAccountId()).isEqualTo(FOLLOWER);
              assertThat(message.matchId()).isEqualTo(laterMatch);
            });
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM pool_follow", Long.class)).isEqualTo(1);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM team_follow", Long.class)).isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_version", Long.class))
        .isZero();
  }

  @Test
  @DisplayName("A completed initial context cannot mutate facts or create deferred announcements")
  void refusesCompletedInitialContext() {
    // Given
    results.complete(initial.id(), NOW.plusSeconds(60));

    // When / Then
    assertThatThrownBy(() -> result(initial, laterMatch, 2, 1))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(
            sql.queryForObject(
                "SELECT result_state FROM sporting_match WHERE id=?", String.class, laterMatch))
        .isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM match_announcement", Long.class)).isZero();
    assertSilent();
  }

  @Test
  @DisplayName("A follow removed after reconstruction cancels the later pending push")
  void checksCurrentFollowBeforeLaterDelivery() {
    // Given
    result(initial, historicalMatch, 2, 1);
    results.complete(initial.id(), NOW.plusSeconds(60));
    Cycle ordinary = ordinaryCycle();
    result(ordinary, laterMatch, 1, 1);
    Runnable pending = pending();

    // When
    follows.replace(follow, false);
    pending.run();

    // Then
    verifyNoInteractions(provider);
    assertThat(sql.queryForList("SELECT match_id FROM notification", UUID.class))
        .containsExactly(laterMatch);
    assertThat(
            sql.queryForObject(
                "SELECT result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                laterMatch))
        .isTrue();
  }

  /**
   * Qualifies a prepared official-shaped reference using explicit synthetic validation evidence.
   *
   * @return source accepted by the actual F01 validation transaction
   */
  private Source qualifiedSource() {
    Source candidate =
        reconstruction.prepare(
            OPERATOR,
            2026,
            CollectionProviderEnum.FFVB,
            "ABCCS",
            URI.create(
                "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?saison=2026/2027&codent=ABCCS"));
    Cycle validationCycle =
        admission
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), STARTUP, null, candidate.id(), candidate.revision(), null))
            .cycle();
    return validation.submitValidation(
        candidate.id(),
        new CollectionState.SourceValidation(
            validationCycle.id(),
            SourceValidationStateEnum.QUALIFIED,
            NOW,
            "2026/2027",
            null,
            null));
  }

  /**
   * Requests and admits one exact initial passage without enabling ordinary collection.
   *
   * @return a fresh backend-authorized initial cycle for the same source
   */
  private Cycle initialCycle() {
    Control requested =
        reconstruction
            .request(
                OPERATOR,
                source.seasonId(),
                seasons.collectionState(source.seasonId()).collectionRevision(),
                Set.of(source.id()),
                Set.of())
            .getFirst();
    return admit(requested);
  }

  /**
   * Launches the source, enables its ordinary control and explicitly requests one manual cycle.
   *
   * @return normal V2 work after initial reconstruction, using the same sporting identities
   */
  private Cycle ordinaryCycle() {
    CollectionSeasonView season = seasons.collectionState(source.seasonId());
    preparation.launch(OPERATOR, season.id(), season.collectionRevision(), Set.of(source.id()));
    Control current = configuration.control(OPERATOR, initial.controlId()).control();
    controls.setActivity(OPERATOR, current.id(), current.revision(), true);
    current = configuration.control(OPERATOR, current.id()).control();
    Control requested =
        controls.request(OPERATOR, current.id(), current.revision()).view().control();
    when(clock.instant()).thenReturn(NOW.plusSeconds(1800));
    return admit(requested);
  }

  /**
   * Freezes exactly the previously accepted F01 request, retaining its request identity.
   *
   * @param requested control carrying the explicit current intent
   * @return admitted work context
   */
  private Cycle admit(Control requested) {
    return admission
        .admit(
            new CollectionState.StartCycle(
                UUID.randomUUID(),
                STARTUP,
                requested.id(),
                null,
                requested.revision(),
                requested.requestId()))
        .cycle();
  }

  /**
   * Accepts a final result and source media through the actual F02 transaction, never F08 imports.
   *
   * @param cycle backend-authorized observation context
   * @param match already known sporting identity
   * @param ordinal explicit supplier read order within that passage
   * @param awaySets scenario's accepted score correction
   */
  private void result(Cycle cycle, UUID match, long ordinal, int awaySets) {
    matches.detail(
        new MatchObservation(
            match,
            context(cycle, ordinal),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(awaySets))
                    .professionalStreamUrl(URI.create("https://example.invalid/source-media")))));
  }

  /**
   * Supplies synthetic source attribution while F01 alone determines trusted initial mode.
   *
   * @param cycle actual admitted passage
   * @param ordinal explicit read ordinal
   * @return attributable observation context without provider credentials
   */
  private MatchObservation.Context context(Cycle cycle, long ordinal) {
    return new MatchObservation.Context(cycle.id(), ordinal, clock.instant(), null);
  }

  /** Verifies silence at SQL, transient handoff and enabled push-worker/provider boundaries. */
  private void assertSilent() {
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
    assertThat(events.stream(AfterCommitAnnouncements.Ready.class)).isEmpty();
    verify(executor, never()).execute(any(Runnable.class));
    verifyNoInteractions(provider);
  }

  /**
   * Captures the single real after-commit sender batch without replacing its eligibility logic.
   *
   * @return production work awaiting controlled execution in this test
   */
  private Runnable pending() {
    ArgumentCaptor<Runnable> work = ArgumentCaptor.forClass(Runnable.class);
    verify(executor).execute(work.capture());
    verifyNoInteractions(provider);
    return work.getValue();
  }
}
