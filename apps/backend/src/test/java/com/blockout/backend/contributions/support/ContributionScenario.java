package com.blockout.backend.contributions.support;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowService;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.ProcessDueLinkAnnouncements;
import com.blockout.backend.sporting.api.SportingObservationMapper;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Shared real F01/F02/F05/F06/F07/F08 scenario. Only time is controlled. The singleton follows
 * Testcontainers' native manual-lifecycle pattern; Ryuk removes it at JVM exit. No other suite's
 * services or database are used. Each test explicitly resets this disposable migrated database.
 */
@SpringBootTest
public abstract class ContributionScenario {
  protected static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  protected static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  protected static final UUID AUTHOR = UUID.fromString("00000000-0000-4000-8000-000000000003");
  protected static final UUID FOLLOWER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  protected static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000002");
  @Autowired protected JdbcTemplate sql;
  @Autowired protected SeasonService seasons;
  @Autowired protected SportingIdentityService identities;
  @Autowired protected CollectionCycleService cycles;
  @Autowired protected CollectorRuntimeService runtimes;
  @Autowired protected CalendarAcceptanceService calendars;
  @Autowired protected MatchAcceptanceService matches;
  @Autowired protected SportingObservationMapper mapper;
  @Autowired protected SubmitContribution submissions;
  @Autowired protected ReadOwnContributions reads;
  @Autowired protected ContributionStore contributions;
  @Autowired protected FollowService follows;
  @Autowired protected ProcessDueLinkAnnouncements due;
  @Autowired protected PlatformTransactionManager transactions;
  @MockitoBean protected Clock clock;
  protected SportingIngestionFixture.Scope scope;
  protected UUID matchId;

  /**
   * Starts and migrates only this test family's container once before Spring validation.
   *
   * @param properties isolated application datasource properties
   * @throws Exception if explicit migration fails
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    if (!DATABASE.isRunning()) {
      DATABASE.start();
      PostgresTestDatabase.migrate(DATABASE);
    }
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Establishes actual admitted matches and original accounts without a provider request. */
  @BeforeEach
  void establishScenario() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    SportingIngestionFixture.reset(DATABASE);
    sql.update("DELETE FROM account");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(1),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 24))),
            List.of(),
            List.of()));
    matchId = sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M1'", UUID.class);
    sql.update(
        "UPDATE sporting_match SET reliable_start=?,local_time='14:00',time_zone='Europe/Paris' WHERE id=?",
        java.sql.Timestamp.from(NOW),
        matchId);
    for (UUID account : List.of(AUTHOR, FOLLOWER, OTHER)) {
      sql.update(
          "INSERT INTO account(id,issuer,subject,username,email,principal_created_at) VALUES (?, 'https://identity.example.invalid/', ?, ?, 'synthetic@example.invalid', '2020-01-01T00:00:00Z')",
          account,
          account.toString(),
          account.toString().replace("-", ""));
    }
  }

  /**
   * Submits the visible explicit version intent; tests keep addresses/revisions at call sites.
   *
   * @param owner original acting account
   * @param revision explicit viewed match revision
   * @param address explicit scenario address
   * @param moderator whether the request uses the administrative publication route
   * @return actual transactional command outcome
   */
  protected SubmitContribution.Outcome submit(
      UUID owner, String revision, String address, boolean moderator) {
    return submissions.submit(owner, matchId, revision, URI.create(address), moderator);
  }

  /**
   * Establishes one current confirmed pool follow through the real F06 owner.
   *
   * @param owner original recipient account
   */
  protected void follow(UUID owner) {
    follows.replace(
        new FollowContext(
            owner, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool())),
        true);
  }

  /**
   * Applies a real designated-source result observation, with explicit source order.
   *
   * @param ordinal explicit later supplier read order
   * @param state explicit source finality, or null for qualified withdrawal
   */
  protected void result(long ordinal, ResultStateEnum state) {
    matches.detail(
        new MatchObservation(
            matchId,
            context(ordinal),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        state == null
                            ? null
                            : new MatchResultInternalRequest(state).homeSets(3).awaySets(1)))));
  }

  /**
   * Grants the exact complete stream capability as a controlled persisted rights fixture.
   *
   * @param owner original acting account
   */
  protected void moderator(UUID owner) {
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'stream-links.moderate')",
        owner);
  }

  /**
   * Supplies ordered attributable observations, never a fabricated cycle authorization.
   *
   * @param ordinal explicit read order within the actually admitted cycle
   * @return attributable synthetic observation context
   */
  protected MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(
        scope.cycle().id(), ordinal, OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC), null);
  }

  /**
   * Reads committed counts from fixed local test table names only.
   *
   * @param table fixed table owned by this test's disposable schema
   * @return current committed row count
   */
  protected long count(String table) {
    return sql.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
  }
}
