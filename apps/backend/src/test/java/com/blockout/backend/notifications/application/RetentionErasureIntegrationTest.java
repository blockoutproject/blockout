package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.notifications.infrastructure.NotificationRetentionConfiguration;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Actual F05 erasure, F07 generated handlers and atomic daily purge against migrated PostgreSQL.
 * Synthetic principals, time and statement interleaving are controlled; providers stay disabled.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Notification retention and original-account erasure")
class RetentionErasureIntegrationTest {
  private static final String COLLECTION = "/accounts/" + ACCOUNT + "/notifications";
  private static final String SUMMARY = "/accounts/" + ACCOUNT + "/notification-summary";
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private EraseAccount erasure;
  @Autowired private MarkNotificationRead marks;
  @Autowired private ReadInbox reads;
  @Autowired private NotificationRetentionConfiguration daily;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoSpyBean private AccountStore accounts;
  @MockitoSpyBean private InboxReadStore inbox;
  @MockitoSpyBean private NotificationStore notifications;
  @MockitoBean private Clock clock;

  /**
   * Prepares only this context's disposable owners and sporting scope.
   *
   * @throws Exception if isolated fixture initialization fails
   */
  @BeforeEach
  void owners() throws Exception {
    reset(database, sql);
    when(clock.instant()).thenReturn(NOW);
  }

  @ParameterizedTest
  @ValueSource(strings = {"page", "summary", "member"})
  @DisplayName(
      "An in-flight read can finish its old snapshot but fresh owner operations refuse erasure")
  void refusesOperationsAfterSnapshotErasure(String operation) throws Exception {
    // Given
    UUID first = entry(sql, 1, ACCOUNT, NOW.minusSeconds(1));
    for (int number = 2; number <= 25; number++)
      entry(sql, number, ACCOUNT, NOW.minusSeconds(number));
    consumedFacts(first);
    JsonNode original = page(null);
    CompletableFuture<Void> selected = new CompletableFuture<>();
    CompletableFuture<Void> finish = new CompletableFuture<>();
    Answer<Object> holdSnapshot =
        call -> {
          Object snapshot = call.callRealMethod();
          selected.complete(null);
          finish.get(10, TimeUnit.SECONDS);
          return snapshot;
        };
    InboxReadStore target = AopTestUtils.getUltimateTargetObject(inbox);
    String path;
    switch (operation) {
      case "page" -> {
        doAnswer(holdSnapshot)
            .when(target)
            .page(any(NotificationContext.class), isNull(), any(Instant.class));
        path = COLLECTION;
      }
      case "summary" -> {
        doAnswer(holdSnapshot)
            .when(target)
            .summary(any(NotificationContext.class), any(Instant.class));
        path = SUMMARY;
      }
      case "member" -> {
        doAnswer(holdSnapshot)
            .when(target)
            .member(any(NotificationContext.class), any(UUID.class), any(Instant.class));
        path = COLLECTION + "/" + first;
      }
      default -> throw new IllegalArgumentException(operation);
    }
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<JsonNode> stale =
          worker.submit(
              () ->
                  json.readTree(
                      mvc.perform(get(path).with(principal()))
                          .andExpect(status().isOk())
                          .andReturn()
                          .getResponse()
                          .getContentAsString()));
      try {
        selected.get(10, TimeUnit.SECONDS);

        // When
        erasure.erase("https://identity.example.invalid/", "one", ACCOUNT);
        finish.complete(null);

        // Then: an already-open repeatable-read snapshot is transport data, not restored rows.
        JsonNode snapshot = stale.get(10, TimeUnit.SECONDS);
        switch (operation) {
          case "page" -> assertThat(snapshot.path("notifications")).hasSize(20);
          case "summary" -> assertThat(snapshot.path("unreadCount").asLong()).isEqualTo(25);
          case "member" -> assertThat(snapshot.path("id").asString()).isEqualTo(first.toString());
          default -> throw new IllegalArgumentException(operation);
        }
        List<MockHttpServletRequestBuilder> requests =
            List.of(
                get(COLLECTION),
                get(COLLECTION).queryParam("cursor", original.path("nextCursor").asString()),
                get(SUMMARY),
                get(COLLECTION + "/" + first),
                patch(COLLECTION + "/" + first)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"read\":true}"));
        for (MockHttpServletRequestBuilder request : requests)
          mvc.perform(request.with(principal())).andExpect(status().isForbidden());
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM notification", Long.class)).isZero();
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Long.class))
            .isEqualTo(25);
        assertFacts(first);
      } finally {
        finish.complete(null);
      }
    }
  }

  @Test
  @DisplayName("A read intent waiting behind actual F05 erasure cannot recreate its original entry")
  void refusesReadWaitingForErasure() throws Exception {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    consumedFacts(id);
    UUID other = entry(sql, 2, OTHER, NOW.minusSeconds(30));
    CompletableFuture<Void> removed = new CompletableFuture<>();
    CompletableFuture<Void> commit = new CompletableFuture<>();
    CompletableFuture<Integer> markingPid = new CompletableFuture<>();
    doAnswer(
            call -> {
              call.callRealMethod();
              removed.complete(null);
              commit.get(10, TimeUnit.SECONDS);
              return null;
            })
        .when(AopTestUtils.<AccountStore>getUltimateTargetObject(accounts))
        .erase(ACCOUNT);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> deleting =
          workers.submit(() -> erasure.erase("https://identity.example.invalid/", "one", ACCOUNT));
      try {
        removed.get(10, TimeUnit.SECONDS);
        Future<?> marking =
            workers.submit(
                () ->
                    new TransactionTemplate(transactions)
                        .executeWithoutResult(
                            status -> {
                              markingPid.complete(
                                  sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                              marks.mark(new NotificationContext(ACCOUNT), id);
                            }));
        PostgresTestDatabase.awaitBlocked(sql, markingPid);

        // When
        commit.complete(null);
        deleting.get(10, TimeUnit.SECONDS);
        Throwable refusal = catchThrowable(() -> marking.get(10, TimeUnit.SECONDS));

        // Then
        assertThat(refusal)
            .isInstanceOf(ExecutionException.class)
            .hasCauseInstanceOf(NotificationNotFoundException.class);
        assertThat(sql.queryForList("SELECT id FROM notification", UUID.class))
            .containsExactly(other);
        assertThat(reads.summary(new NotificationContext(OTHER)).unreadCount()).isEqualTo(1);
        assertThat(reads.member(new NotificationContext(OTHER), other).createdAt())
            .isEqualTo(NOW.minusSeconds(30));
        assertFacts(id);
      } finally {
        commit.complete(null);
      }
    }
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Daily purge and actual F05 erasure commit safely in either lock order")
  void serializesPurgeWithErasure(boolean purgeFirst) throws Exception {
    // Given
    UUID expired = entry(sql, 1, ACCOUNT, NOW.minus(Duration.ofDays(29)));
    entry(sql, 2, ACCOUNT, NOW.minusSeconds(60));
    UUID other = entry(sql, 3, OTHER, NOW.minusSeconds(30));
    consumedFacts(expired);
    CompletableFuture<Void> removed = new CompletableFuture<>();
    CompletableFuture<Void> commit = new CompletableFuture<>();
    CompletableFuture<Integer> waitingPid = new CompletableFuture<>();
    NotificationStore target = AopTestUtils.getUltimateTargetObject(notifications);
    if (purgeFirst) {
      doAnswer(
              call -> {
                Object deleted = call.callRealMethod();
                removed.complete(null);
                commit.get(10, TimeUnit.SECONDS);
                return deleted;
              })
          .when(target)
          .deleteExpired(any(Instant.class));
      doAnswer(
              call -> {
                waitingPid.complete(sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                return call.callRealMethod();
              })
          .when(target)
          .erase(ACCOUNT);
    } else {
      doAnswer(
              call -> {
                call.callRealMethod();
                removed.complete(null);
                commit.get(10, TimeUnit.SECONDS);
                return null;
              })
          .when(AopTestUtils.<AccountStore>getUltimateTargetObject(accounts))
          .erase(ACCOUNT);
      doAnswer(
              call -> {
                waitingPid.complete(sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                return call.callRealMethod();
              })
          .when(target)
          .deleteExpired(any(Instant.class));
    }
    Runnable erase = () -> erasure.erase("https://identity.example.invalid/", "one", ACCOUNT);
    try (ExecutorService workers = Executors.newFixedThreadPool(2)) {
      Future<?> first = workers.submit(purgeFirst ? daily::purge : erase);
      try {
        removed.get(10, TimeUnit.SECONDS);
        Future<?> second = workers.submit(purgeFirst ? erase : daily::purge);
        PostgresTestDatabase.awaitBlocked(sql, waitingPid);

        // When
        commit.complete(null);
        first.get(10, TimeUnit.SECONDS);
        second.get(10, TimeUnit.SECONDS);

        // Then
        assertThat(sql.queryForList("SELECT id FROM notification", UUID.class))
            .containsExactly(other);
        assertThat(accounts.findById(ACCOUNT)).isEmpty();
        assertThat(reads.summary(new NotificationContext(OTHER)).unreadCount()).isEqualTo(1);
        assertFacts(expired);
        assertThat(sql.queryForObject("SELECT COUNT(*) FROM sporting_match", Long.class))
            .isEqualTo(3);
      } finally {
        commit.complete(null);
      }
    }
  }

  /**
   * Supplies an explicit minimal non-personal fact whose survival is observable after erasure.
   *
   * @param match exact synthetic sporting match
   */
  private void consumedFacts(UUID match) {
    sql.update(
        "INSERT INTO match_announcement(match_id,live_processed,result_processed,post_result_processed,result_composition) VALUES (?,TRUE,TRUE,TRUE,'ENRICHED_RESULT')",
        match);
  }

  /**
   * Verifies erasure and purge leave the exact consumed categories/composition unchanged.
   *
   * @param match original sporting identity independent of personal entries
   */
  private void assertFacts(UUID match) {
    assertThat(
            sql.queryForObject(
                "SELECT live_processed AND result_processed AND post_result_processed AND result_composition='ENRICHED_RESULT' FROM match_announcement WHERE match_id=?",
                Boolean.class,
                match))
        .isTrue();
  }

  /**
   * Traverses the generated handler and production serialization without test-side filtering.
   *
   * @param cursor original continuation, or absent for ordinary refresh
   * @return actual serialized current-owner page
   * @throws Exception if HTTP execution or response parsing fails
   */
  private JsonNode page(String cursor) throws Exception {
    MockHttpServletRequestBuilder request = get(COLLECTION).with(principal());
    if (cursor != null) request.queryParam("cursor", cursor);
    return json.readTree(
        mvc.perform(request)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /**
   * Supplies already-validated synthetic claims; actual provider authentication is out of scope.
   *
   * @return a request-local principal for the original fixture account
   */
  private static RequestPostProcessor principal() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("one")
                    .claim("azp", "mobile-test"));
  }
}
