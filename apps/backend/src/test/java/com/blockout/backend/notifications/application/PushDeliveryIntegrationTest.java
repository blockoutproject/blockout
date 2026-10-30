package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.HOME;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Migrated PostgreSQL and real owner reads; only executor, clock and external HTTP are controlled.
 */
@SpringBootTest(
    properties = {
      "blockout.notifications.push.enabled=true",
      "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000001",
      "blockout.notifications.push.access-token=synthetic-not-a-credential",
      "blockout.notifications.retention-cron=-",
      "blockout.notifications.link-announcements-cron=-"
    })
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Committed push eligibility on PostgreSQL")
class PushDeliveryIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private AfterCommitAnnouncements announcements;
  @Autowired private ReadPushEligibility eligibility;
  @Autowired private PushSubscriptionStore subscriptions;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private Clock clock;
  @MockitoBean private PushProvider provider;

  @MockitoBean(name = "pushExecutor")
  private ThreadPoolTaskExecutor executor;

  private UUID notification;
  private Created created;
  private Target target;
  private static final UUID RELATION = UUID.fromString("00000000-0000-4000-8000-000000000090");

  /** Prepares only this suite's disposable database and explicit synthetic original targets. */
  @BeforeEach
  void owners() throws Exception {
    reset(database, sql);
    when(clock.instant()).thenReturn(NOW);
    notification = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    sql.update(
        "INSERT INTO team_follow(id,account_id,team_id) VALUES (?,?,?)", RELATION, ACCOUNT, HOME);
    sql.update(
        "INSERT INTO push_subscription(id,subscription_id,installation_id,account_id,expo_push_token,revision) VALUES (?,?,?,?,?,4)",
        RELATION,
        UUID.randomUUID(),
        UUID.randomUUID(),
        ACCOUNT,
        "ExponentPushToken[synthetic]");
    target = new Target(RELATION, 4, "ExponentPushToken[synthetic]");
    created =
        new Created(
            new AllocateAnnouncements.Entry(
                notification,
                ACCOUNT,
                notification,
                NotificationFamily.ENRICHED_RESULT,
                NotificationVariant.FIRST,
                NOW.minusSeconds(60)),
            Set.of(
                new Relation(RELATION, ACCOUNT, new FollowContext.Target(TargetType.TEAM, HOME))));
  }

  @Test
  @DisplayName("Rollback discards the event without submitting external work")
  void ignoresRollback() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    transaction.executeWithoutResult(
        status -> {
          announcements.submit(List.of(created));
          status.setRollbackOnly();
        });

    // Then
    verifyNoInteractions(executor, provider);
  }

  @Test
  @DisplayName("Only a successful commit submits work and HTTP runs outside SQL")
  void sendsAfterCommit() {
    // Given
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    when(provider.send(any()))
        .thenAnswer(
            invocation -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              return List.of(new Outcome(Status.UNKNOWN, null));
            });
    ArgumentCaptor<Runnable> work = ArgumentCaptor.forClass(Runnable.class);

    // When
    transaction.executeWithoutResult(
        status -> {
          announcements.submit(List.of(created));
          verifyNoInteractions(executor, provider);
        });
    verify(executor).execute(work.capture());
    work.getValue().run();

    // Then
    verify(provider).send(any());
    assertThat(
            sql.queryForObject(
                "SELECT count(*) FROM notification WHERE id=?", Integer.class, notification))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Recreated follows cannot preserve an original relation incarnation")
  void refusesRecreatedFollow() {
    // Given
    sql.update("DELETE FROM team_follow WHERE id=?", RELATION);
    sql.update(
        "INSERT INTO team_follow(id,account_id,team_id) VALUES (?,?,?)",
        UUID.randomUUID(),
        ACCOUNT,
        HOME);

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "DELETE FROM notification WHERE id=?",
        "UPDATE sporting_match SET present=FALSE WHERE id=?"
      })
  @DisplayName("Current entry removal or sporting hiding prevents handoff")
  void refusesUnavailableEntry(String change) {
    // Given
    sql.update(change, notification);

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Exactly twenty-nine elapsed days excludes a still-persisted entry")
  void refusesExpiredEntry() {
    // Given
    when(clock.instant()).thenReturn(NOW.minusSeconds(60).plus(Duration.ofDays(29)));

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Association revision or owner changes cancel a captured target")
  void refusesReassociatedTarget() {
    // Given
    sql.update(
        "UPDATE push_subscription SET account_id=?,revision=5 WHERE id=?", OTHER, target.id());

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("An erased owner cannot send its old allocation")
  void refusesErasedOwner() {
    // Given
    sql.update("DELETE FROM team_follow WHERE account_id=?", ACCOUNT);
    sql.update("DELETE FROM account WHERE id=?", ACCOUNT);

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("Conditional invalidation cannot remove a newer registration")
  void preservesNewerRegistration() {
    // Given
    sql.update("UPDATE push_subscription SET revision=5 WHERE id=?", target.id());

    // When
    boolean removed = subscriptions.invalidate(target.id(), target.revision(), target.address());

    // Then
    assertThat(removed).isFalse();
    assertThat(sql.queryForObject("SELECT count(*) FROM push_subscription", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Current corrected sporting facts and link absence supply safe text")
  void usesCurrentContent() {
    // Given
    sql.update("UPDATE sporting_match SET home_sets=1,away_sets=3 WHERE id=?", notification);

    // When
    Message result = eligibility.current(created, target).orElseThrow();

    // Then
    assertThat(result.text().body())
        .contains("1–3", "Le lien n’est plus proposé.")
        .doesNotContain("3–1");
  }

  @Test
  @DisplayName("One surviving original overlapping origin still permits a send")
  void retainsSurvivingOrigin() {
    // Given
    UUID poolRelation = UUID.fromString("00000000-0000-4000-8000-000000000091");
    sql.update(
        "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
        poolRelation,
        ACCOUNT,
        com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.POOL);
    Created overlapping =
        new Created(
            created.entry(),
            Set.of(
                created.relations().iterator().next(),
                new Relation(
                    poolRelation,
                    ACCOUNT,
                    new FollowContext.Target(
                        TargetType.POOL,
                        com.blockout.backend.notifications.testsupport.InboxDatabaseFixture
                            .POOL))));
    sql.update("DELETE FROM team_follow WHERE id=?", RELATION);

    // When
    java.util.Optional<Message> result = eligibility.current(overlapping, target);

    // Then
    assertThat(result).isPresent();
  }

  @ParameterizedTest
  @ValueSource(strings = {"before", "unknown", "final", "withdrawn"})
  @DisplayName("Obsolete or premature live announcements cannot be handed off")
  void refusesIneligibleLive(String state) {
    // Given
    live(state);

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("A still-current live link at its reliable start remains eligible")
  void permitsLiveAtStart() {
    // Given
    live("current");

    // When
    java.util.Optional<Message> result = eligibility.current(created, target);

    // Then
    assertThat(result).isPresent();
  }

  @Test
  @DisplayName("Maintenance after commit drops work without removing the inbox")
  void suppressesCurrentMaintenance() {
    // Given
    new TransactionTemplate(transactions)
        .executeWithoutResult(status -> announcements.submit(List.of(created)));
    ArgumentCaptor<Runnable> work = ArgumentCaptor.forClass(Runnable.class);
    verify(executor).execute(work.capture());
    sql.update("UPDATE access_settings SET active=TRUE WHERE id='maintenance'");
    try {
      // When
      work.getValue().run();

      // Then
      verifyNoInteractions(provider);
      assertThat(
              sql.queryForObject(
                  "SELECT count(*) FROM notification WHERE id=?", Integer.class, notification))
          .isEqualTo(1);
    } finally {
      sql.update("UPDATE access_settings SET active=FALSE WHERE id='maintenance'");
    }
  }

  /**
   * Prepares an explicit persisted live case while keeping current sporting/contribution reads
   * real.
   *
   * @param state current, before H, unknown H, final result or withdrawn public link
   */
  private void live(String state) {
    sql.update("UPDATE notification SET family='LIVE_LINK' WHERE id=?", notification);
    sql.update(
        "UPDATE sporting_match SET local_date='2026-10-25',local_time=?,time_zone='UTC',result_state=?,home_sets=NULL,away_sets=NULL WHERE id=?",
        state.equals("unknown") ? null : state.equals("before") ? "13:00" : "12:00",
        state.equals("final") ? "FINAL" : null,
        notification);
    sql.update(
        "UPDATE sporting_match SET reliable_start=? WHERE id=?",
        state.equals("unknown")
            ? null
            : java.sql.Timestamp.from(state.equals("before") ? NOW.plusSeconds(3600) : NOW),
        notification);
    sql.update(
        "INSERT INTO contribution_version(id,match_id,address,platform,state,created_at,quota_participating) VALUES (?,?,'https://youtube.com/watch?v=demo','YOUTUBE',?,?,FALSE)",
        UUID.randomUUID(),
        notification,
        state.equals("withdrawn") ? "HIDDEN" : "ACTIVE",
        java.sql.Timestamp.from(NOW));
    created =
        new Created(
            new AllocateAnnouncements.Entry(
                notification,
                ACCOUNT,
                notification,
                NotificationFamily.LIVE_LINK,
                NotificationVariant.FIRST,
                NOW.minusSeconds(60)),
            created.relations());
  }
}
