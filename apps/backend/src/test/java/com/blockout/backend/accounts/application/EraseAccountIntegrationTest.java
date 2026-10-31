package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.notifications.application.ChangePushSubscriptions;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Real local owners/transactions; only external providers are controlled synthetic boundaries. */
@DisplayName("Atomic original-account erasure")
class EraseAccountIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private EraseAccount erasure;
  @MockitoSpyBean private AccountStore accounts;
  @Autowired private AccountAccess locks;
  @Autowired private ChangeAccountProfile profiles;
  @Autowired private ChangePushSubscriptions destinations;
  @Autowired private ReportContribution reports;
  @Autowired private EstablishAccount establishment;
  @MockitoBean private AccountCleanup.Auth0 auth0;
  @MockitoBean private AccountCleanup.RevenueCat revenueCat;
  @MockitoBean private PrincipalReader principal;

  @Test
  @DisplayName("Removes photo, hidden follows, inbox and grants before independent provider calls")
  void commitsEveryPersonalOwner() {
    // Given
    follow(FOLLOWER);
    follows.replace(
        new FollowContext(
            FOLLOWER,
            new FollowContext.Target(
                FollowContext.TargetType.TEAM,
                sql.queryForObject(
                    "SELECT home_team_id FROM sporting_match WHERE id=?", UUID.class, matchId))),
        true);
    follow(OTHER);
    submit(AUTHOR, "0", "https://youtu.be/facts", false);
    profiles.change(
        ISSUER,
        FOLLOWER.toString(),
        FOLLOWER,
        null,
        ProfilePhotoActionEnum.REPLACE,
        new ProfilePhoto(new byte[] {1}, "image/png", 1));
    destinations.replace(
        new Registration(UUID.randomUUID(), UUID.randomUUID(), FOLLOWER, "Expo[original]"));
    moderator(FOLLOWER);
    sql.update(
        "UPDATE sporting_pool SET catalog_eligible=FALSE, calendar_empty=TRUE WHERE id=?",
        scope.pool());
    doAnswer(
            call -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              assertThat(accounts.findById(FOLLOWER)).isEmpty();
              assertThat(
                      sql.queryForObject(
                          "SELECT COUNT(*) FROM notification WHERE account_id=?",
                          Long.class,
                          FOLLOWER))
                  .isZero();
              throw new IllegalStateException("synthetic-provider-failure");
            })
        .when(auth0)
        .remove(ISSUER, FOLLOWER.toString());
    when(revenueCat.remove(FOLLOWER.toString())).thenReturn(AccountCleanup.Outcome.QUEUED);

    // When
    erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);

    // Then
    for (String table :
        List.of(
            "account_permission",
            "pool_follow",
            "team_follow",
            "notification",
            "push_subscription"))
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM " + table + " WHERE account_id=?", Long.class, FOLLOWER))
          .as(table)
          .isZero();
    assertThat(accounts.findById(FOLLOWER)).isEmpty();
    assertThat(accounts.findById(OTHER)).isPresent();
    org.mockito.Mockito.verify(revenueCat).remove(FOLLOWER.toString());
    assertThat(count("sporting_match")).isEqualTo(1);
    assertThat(count("match_announcement")).isEqualTo(1);
  }

  @Test
  @DisplayName("Another principal cannot erase the original owner or invoke its providers")
  void hidesForeignOwner() {
    // Given
    UUID target = AUTHOR;

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable erase =
        () -> erasure.erase(ISSUER, FOLLOWER.toString(), target);

    // Then
    assertThatThrownBy(erase).isInstanceOf(AccountNotFoundException.class);
    assertThat(accounts.findById(target)).isPresent();
    verifyNoInteractions(auth0, revenueCat);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("A required SQL failure rolls back all owners and prevents provider effects")
  void rollsBackAllOwners(boolean failAtAccount) throws Exception {
    // Given
    follow(FOLLOWER);
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/facts", false);
    reports.report(FOLLOWER, active.version().id(), "Synthetic private reason");
    destinations.replace(
        new Registration(UUID.randomUUID(), UUID.randomUUID(), FOLLOWER, "Expo[original]"));
    moderator(FOLLOWER);
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement statement = connection.createStatement()) {
      if (failAtAccount) {
        statement.execute(
            "CREATE FUNCTION synthetic_refuse_account_erasure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic erasure refusal' USING ERRCODE = '23514'; END $$");
        statement.execute(
            "CREATE TRIGGER synthetic_refuse_erasure BEFORE DELETE ON account FOR EACH ROW EXECUTE FUNCTION synthetic_refuse_account_erasure()");
      } else {
        statement.execute(
            "ALTER TABLE contribution_report ADD CONSTRAINT synthetic_reject_erasure CHECK (reporter_id IS NOT NULL)");
      }
      try {
        // When
        org.assertj.core.api.ThrowableAssert.ThrowingCallable erase =
            () -> erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);

        // Then
        assertThatThrownBy(erase).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(accounts.findById(FOLLOWER)).isPresent();
        assertThat(
                sql.queryForObject(
                    "SELECT reason FROM contribution_report WHERE reporter_id=?",
                    String.class,
                    FOLLOWER))
            .isEqualTo("Synthetic private reason");
        for (String table :
            List.of("account_permission", "pool_follow", "notification", "push_subscription"))
          assertThat(
                  sql.queryForObject(
                      "SELECT COUNT(*) FROM " + table + " WHERE account_id=?",
                      Long.class,
                      FOLLOWER))
              .as(table)
              .isEqualTo(1);
        verifyNoInteractions(auth0, revenueCat);
      } finally {
        if (failAtAccount) {
          statement.execute("DROP TRIGGER synthetic_refuse_erasure ON account");
          statement.execute("DROP FUNCTION synthetic_refuse_account_erasure()");
        } else {
          statement.execute(
              "ALTER TABLE contribution_report DROP CONSTRAINT synthetic_reject_erasure");
        }
      }
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"profile", "follow", "destination", "grant"})
  @DisplayName("A real writer commits first and erasure removes its accepted effects")
  void removesWriterThatCommitsFirst(String writer) throws Exception {
    // Given
    when(auth0.remove(any(), any())).thenReturn(AccountCleanup.Outcome.REMOVED);
    when(revenueCat.remove(any())).thenReturn(AccountCleanup.Outcome.QUEUED);
    CompletableFuture<Integer> erasurePid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> erased =
          new TransactionTemplate(transactions)
              .execute(
                  status -> {
                    assertThat(locks.lock(FOLLOWER)).isTrue();
                    switch (writer) {
                      case "profile" ->
                          profiles.change(
                              ISSUER, FOLLOWER.toString(), FOLLOWER, "Updated", null, null);
                      case "follow" -> follow(FOLLOWER);
                      case "destination" ->
                          destinations.replace(
                              new Registration(
                                  UUID.randomUUID(), UUID.randomUUID(), FOLLOWER, "Expo[race]"));
                      case "grant" -> moderator(FOLLOWER);
                      default -> throw new IllegalArgumentException(writer);
                    }
                    doAnswer(
                            call -> {
                              erasurePid.complete(
                                  sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                              return call.callRealMethod();
                            })
                        .when(
                            org.springframework.test.util.AopTestUtils
                                .<AccountStore>getUltimateTargetObject(accounts))
                        .lockById(FOLLOWER);
                    Future<?> deleting =
                        worker.submit(() -> erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER));
                    PostgresTestDatabase.awaitBlocked(sql, erasurePid);
                    assertThat(deleting.isDone()).isFalse();
                    return deleting;
                  });
      erased.get(10, TimeUnit.SECONDS);
    }

    // When: worker closure waits for the real erasure commit after the writer releases its lock.
    // Then
    assertThat(accounts.findById(FOLLOWER)).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM pool_follow WHERE account_id=?", Long.class, FOLLOWER))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM push_subscription WHERE account_id=?", Long.class, FOLLOWER))
        .isZero();
  }

  @ParameterizedTest
  @ValueSource(strings = {"profile", "follow", "destination", "grant"})
  @DisplayName("A real writer ordered after erasure cannot resurrect an association")
  void rejectsWriterAfterErasure(String writer) throws Exception {
    // Given
    when(auth0.remove(any(), any())).thenReturn(AccountCleanup.Outcome.REMOVED);
    when(revenueCat.remove(any())).thenReturn(AccountCleanup.Outcome.QUEUED);
    CompletableFuture<Void> deleted = new CompletableFuture<>();
    CompletableFuture<Void> commit = new CompletableFuture<>();
    CompletableFuture<Integer> writerPid = new CompletableFuture<>();
    doAnswer(
            call -> {
              call.callRealMethod();
              deleted.complete(null);
              commit.get(10, TimeUnit.SECONDS);
              return null;
            })
        .when(
            org.springframework.test.util.AopTestUtils.<AccountStore>getUltimateTargetObject(
                accounts))
        .erase(FOLLOWER);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> erasing =
          workers.submit(() -> erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER));
      deleted.get(10, TimeUnit.SECONDS);
      Future<?> writing =
          workers.submit(
              () ->
                  new TransactionTemplate(transactions)
                      .executeWithoutResult(
                          status -> {
                            writerPid.complete(
                                sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                            switch (writer) {
                              case "profile" ->
                                  profiles.change(
                                      ISSUER, FOLLOWER.toString(), FOLLOWER, "TooLate", null, null);
                              case "follow" -> follow(FOLLOWER);
                              case "destination" ->
                                  destinations.replace(
                                      new Registration(
                                          UUID.randomUUID(),
                                          UUID.randomUUID(),
                                          FOLLOWER,
                                          "Expo[late]"));
                              case "grant" -> {
                                if (!locks.lock(FOLLOWER)) throw new AccountNotFoundException();
                                moderator(FOLLOWER);
                              }
                              default -> throw new IllegalArgumentException(writer);
                            }
                          }));
      PostgresTestDatabase.awaitBlocked(sql, writerPid);

      // When
      commit.complete(null);
      erasing.get(10, TimeUnit.SECONDS);

      // Then
      Class<? extends RuntimeException> refusal =
          switch (writer) {
            case "follow" ->
                com.blockout.backend.following.application.FollowUnavailableTargetException.class;
            case "destination" ->
                com.blockout.backend.notifications.application.NotificationNotFoundException.class;
            default -> AccountNotFoundException.class;
          };
      assertThatThrownBy(() -> writing.get(10, TimeUnit.SECONDS)).hasCauseInstanceOf(refusal);
      assertThat(accounts.findById(FOLLOWER)).isEmpty();
      for (String table : List.of("account_permission", "pool_follow", "push_subscription"))
        assertThat(
                sql.queryForObject(
                    "SELECT COUNT(*) FROM " + table + " WHERE account_id=?", Long.class, FOLLOWER))
            .as(table)
            .isZero();
    } finally {
      commit.complete(null);
    }
  }

  @Test
  @DisplayName("Old provider synchronization cannot create or modify a replacement lifecycle")
  void rejectsOldProviderSynchronization() throws Exception {
    // Given
    when(auth0.remove(any(), any())).thenReturn(AccountCleanup.Outcome.REMOVED);
    when(revenueCat.remove(any())).thenReturn(AccountCleanup.Outcome.QUEUED);
    CompletableFuture<Void> requested = new CompletableFuture<>();
    CompletableFuture<PrincipalReader.Evidence> response = new CompletableFuture<>();
    when(principal.read(ISSUER, FOLLOWER.toString()))
        .thenAnswer(
            call -> {
              requested.complete(null);
              return response.get(10, TimeUnit.SECONDS);
            });
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<EstablishAccount.Outcome> old =
          worker.submit(() -> establishment.establish(ISSUER, FOLLOWER.toString()));
      requested.get(10, TimeUnit.SECONDS);
      erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
      UUID replacement =
          new TransactionTemplate(transactions)
              .execute(
                  status ->
                      accounts
                          .create(
                              ISSUER,
                              FOLLOWER.toString(),
                              "Replacement",
                              "replacement@example.invalid",
                              null)
                          .id());

      // When
      response.complete(new PrincipalReader.Evidence("old@example.invalid", NOW, List.of()));

      // Then
      assertThatThrownBy(() -> old.get(10, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccountUnavailableException.class);
      assertThat(accounts.findById(replacement).orElseThrow().email())
          .isEqualTo("replacement@example.invalid");
      assertThatThrownBy(() -> erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER))
          .isInstanceOf(AccountNotFoundException.class);
      org.mockito.Mockito.verify(auth0).remove(ISSUER, FOLLOWER.toString());
    } finally {
      response.complete(new PrincipalReader.Evidence(null, null, List.of()));
    }
  }
}
