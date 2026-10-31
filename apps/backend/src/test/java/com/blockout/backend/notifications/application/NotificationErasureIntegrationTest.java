package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.notifications.application.AfterCommitAnnouncements.Ready;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/** Real F05/F06/F07 erasure with synthetic accounts and no enabled external sender. */
@RecordApplicationEvents
@AutoConfigureMockMvc
@DisplayName("Notification account erasure")
class NotificationErasureIntegrationTest extends ContributionScenario {
  private static final UUID CONNECTION = UUID.fromString("10000000-0000-4000-8000-000000000701");
  private static final UUID NEXT = UUID.fromString("10000000-0000-4000-8000-000000000702");
  private static final UUID SECOND = UUID.fromString("10000000-0000-4000-8000-000000000703");
  private static final UUID INSTALLATION = UUID.fromString("20000000-0000-4000-8000-000000000701");
  private static final UUID OTHER_INSTALLATION =
      UUID.fromString("20000000-0000-4000-8000-000000000702");
  private static final UUID SECOND_INSTALLATION =
      UUID.fromString("20000000-0000-4000-8000-000000000703");
  @Autowired private MockMvc mvc;
  @Autowired private EraseAccount erasure;
  @MockitoSpyBean private AccountStore accounts;
  @Autowired private PushSubscriptionStore store;
  @Autowired private DeliverPush delivery;
  @MockitoBean private PushProvider provider;
  @Autowired private ApplicationEvents events;
  @Autowired private ChangePushSubscriptions subscriptions;

  @Test
  @DisplayName("Erases owned inbox and destinations while keeping other owners and sporting facts")
  void erasesPersonalAllocations() throws Exception {
    // Given
    follow(FOLLOWER);
    follow(OTHER);
    submit(AUTHOR, "0", "https://youtu.be/synthetic", false);
    subscriptions.replace(new Registration(CONNECTION, INSTALLATION, FOLLOWER, "Expo[original]"));
    subscriptions.replace(new Registration(NEXT, OTHER_INSTALLATION, OTHER, "Expo[other]"));
    result(2, com.blockout.backend.generated.ingestion.model.ResultStateEnum.FINAL);
    subscriptions.replace(
        new Registration(SECOND, SECOND_INSTALLATION, FOLLOWER, "Expo[second-device]"));
    long facts = count("match_announcement");
    assertThat(count("notification")).isEqualTo(4);
    sql.update(
        "UPDATE sporting_pool SET catalog_eligible=FALSE, calendar_empty=TRUE WHERE id=?",
        scope.pool());

    // When
    mvc.perform(
            delete("/accounts/{id}", FOLLOWER)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .subject(FOLLOWER.toString())
                                    .audience(java.util.List.of("mobile-test"))
                                    .claim("azp", "mobile-test"))
                        .authorities(new SimpleGrantedAuthority("SCOPE_openid"))))
        .andExpect(status().isNoContent())
        .andExpect(content().string(""));

    // Then
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM notification WHERE account_id=?", Long.class, FOLLOWER))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM push_subscription WHERE account_id=?", Long.class, FOLLOWER))
        .isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM notification WHERE account_id=?", Long.class, OTHER))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM push_subscription WHERE account_id=?", Long.class, OTHER))
        .isEqualTo(1);
    assertThat(count("match_announcement")).isEqualTo(facts);
  }

  @Test
  @DisplayName("Reassociation committed first survives original-account erasure")
  void preservesReassociatedDestination() throws Exception {
    // Given
    UUID installation = INSTALLATION;
    UUID old = CONNECTION;
    UUID next = NEXT;
    subscriptions.replace(new Registration(old, installation, FOLLOWER, "Expo[original]"));
    CompletableFuture<Integer> erasurePid = new CompletableFuture<>();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> deleted =
          new TransactionTemplate(transactions)
              .execute(
                  status -> {
                    subscriptions.replace(
                        new Registration(next, installation, OTHER, "Expo[original]"));
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
                        worker.submit(
                            () ->
                                erasure.erase(
                                    "https://identity.example.invalid/",
                                    FOLLOWER.toString(),
                                    FOLLOWER));
                    PostgresTestDatabase.awaitBlocked(sql, erasurePid);
                    assertThat(deleting.isDone()).isFalse();
                    return deleting;
                  });

      // When
      deleted.get(10, TimeUnit.SECONDS);

      // Then
      assertThat(
              sql.queryForObject(
                  "SELECT account_id FROM push_subscription WHERE subscription_id=?",
                  UUID.class,
                  next))
          .isEqualTo(OTHER);
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM push_subscription WHERE subscription_id=?",
                  Long.class,
                  old))
          .isZero();
    }
  }

  @Test
  @DisplayName("Reassociation ordered after erasure registers only the surviving new owner")
  void reassociatesAfterErasure() throws Exception {
    // Given
    UUID installation = INSTALLATION;
    UUID next = NEXT;
    subscriptions.replace(new Registration(CONNECTION, installation, FOLLOWER, "Expo[original]"));
    CompletableFuture<Void> removed = new CompletableFuture<>();
    CompletableFuture<Void> commit = new CompletableFuture<>();
    CompletableFuture<Integer> registrationPid = new CompletableFuture<>();
    doAnswer(
            call -> {
              call.callRealMethod();
              removed.complete(null);
              commit.get(10, TimeUnit.SECONDS);
              return null;
            })
        .when(
            org.springframework.test.util.AopTestUtils.<AccountStore>getUltimateTargetObject(
                accounts))
        .erase(FOLLOWER);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> deleting =
          workers.submit(
              () ->
                  erasure.erase(
                      "https://identity.example.invalid/", FOLLOWER.toString(), FOLLOWER));
      try {
        removed.get(10, TimeUnit.SECONDS);
        Future<?> registering =
            workers.submit(
                () ->
                    new TransactionTemplate(transactions)
                        .executeWithoutResult(
                            status -> {
                              registrationPid.complete(
                                  sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                              subscriptions.replace(
                                  new Registration(next, installation, OTHER, "Expo[original]"));
                            }));
        PostgresTestDatabase.awaitBlocked(sql, registrationPid);

        // When
        commit.complete(null);
        deleting.get(10, TimeUnit.SECONDS);
        registering.get(10, TimeUnit.SECONDS);

        // Then
        assertThat(
                sql.queryForObject(
                    "SELECT account_id FROM push_subscription WHERE subscription_id=?",
                    UUID.class,
                    next))
            .isEqualTo(OTHER);
        assertThat(accounts.findById(FOLLOWER)).isEmpty();
      } finally {
        commit.complete(null);
      }
    }
  }

  @Test
  @DisplayName("Captured in-flight work and late receipt cannot target a later association")
  void rejectsOldDeliveryAfterErasure() {
    // Given
    UUID installation = INSTALLATION;
    subscriptions.replace(new Registration(CONNECTION, installation, FOLLOWER, "Expo[original]"));
    follow(FOLLOWER);
    submit(AUTHOR, "0", "https://youtu.be/inflight", false);
    Ready ready = events.stream(Ready.class).findFirst().orElseThrow();
    PushSubscriptionStore.Target old = ready.targets().get(FOLLOWER).getFirst();
    List<DeliverPush.Attempt> attempts =
        ready.entries().stream().map(created -> new DeliverPush.Attempt(created, old)).toList();

    // When
    erasure.erase("https://identity.example.invalid/", FOLLOWER.toString(), FOLLOWER);
    subscriptions.replace(new Registration(NEXT, installation, OTHER, "Expo[original]"));
    delivery.deliver(attempts);
    boolean invalidated =
        new TransactionTemplate(transactions)
            .execute(status -> store.invalidate(old.id(), old.revision(), old.address()));

    // Then
    verifyNoInteractions(provider);
    assertThat(invalidated).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT account_id FROM push_subscription WHERE installation_id=?",
                UUID.class,
                installation))
        .isEqualTo(OTHER);
    assertThat(count("match_announcement")).isEqualTo(1);
  }
}
