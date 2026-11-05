package com.blockout.backend.notifications.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.notifications.infrastructure.NotificationRetentionConfiguration;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

/**
 * Real F12 HTTP/settings, F02 producers, F07 inbox/sender/retention and migrated PostgreSQL. Only
 * time, worker/receipt execution and the external Expo boundary are controlled; no device receipt
 * proof.
 */
@SpringBootTest(
    properties = {
      "blockout.notifications.push.enabled=true",
      "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000272",
      "blockout.notifications.push.access-token=synthetic-not-a-credential",
      "blockout.notifications.retention-cron=-",
      "blockout.notifications.link-announcements-cron=-"
    })
@AutoConfigureMockMvc
@DisplayName("Maintenance notification continuity through actual owners")
class MaintenanceNotificationIntegrationTest extends ContributionScenario {
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private ReadInbox inbox;
  @Autowired private ChangePushSubscriptions subscriptions;
  @Autowired private NotificationRetentionConfiguration daily;
  @MockitoBean private PushProvider provider;

  @MockitoBean(name = "pushExecutor")
  private ThreadPoolTaskExecutor executor;

  @MockitoBean(name = "pushReceiptScheduler")
  private ThreadPoolTaskScheduler receiptScheduler;

  private final List<Runnable> pending = new ArrayList<>();

  /**
   * Installs explicit grants and captures only the production after-commit worker boundary.
   *
   * @throws Exception if the actual settings HTTP boundary refuses the initial inactive state
   */
  @BeforeEach
  void prepareAdmission() throws Exception {
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'maintenance.manage'),(?,'maintenance.bypass')",
        AUTHOR,
        OTHER);
    maintenance(false);
    pending.clear();
    doAnswer(
            invocation -> {
              pending.add(invocation.getArgument(0, Runnable.class));
              return null;
            })
        .when(executor)
        .execute(any(Runnable.class));
  }

  @Test
  @DisplayName("Retains every eligible inbox while skipping ordinary and bypass recipients")
  void retainsSkippedEntries() throws Exception {
    // Given
    follow(FOLLOWER);
    follow(OTHER);
    destination(FOLLOWER, 1);
    destination(OTHER, 2);
    maintenance(true);

    // When
    result(2, ResultStateEnum.FINAL);
    List<Entry> ordinary = inbox.page(new NotificationContext(FOLLOWER), null).entries();
    List<Entry> operator = inbox.page(new NotificationContext(OTHER), null).entries();
    assertThat(pending).hasSize(1);
    runPending();

    // Then
    assertThat(ordinary)
        .singleElement()
        .satisfies(entry -> assertThat(entry.createdAt()).isEqualTo(NOW));
    assertThat(operator)
        .singleElement()
        .satisfies(entry -> assertThat(entry.createdAt()).isEqualTo(NOW));
    assertThat(count("notification")).isEqualTo(2);
    verifyNoInteractions(provider);
    mvc.perform(get("/accounts/" + FOLLOWER + "/notifications").with(principal(FOLLOWER)))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
    mvc.perform(
            get("/accounts/" + OTHER + "/notifications")
                .with(principal(OTHER))
                .header("Blockout-Maintenance-Bypass", "true"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.notifications.length()").value(1));

    // When: reopening and ordinary repeated processing cannot replenish consumed categories.
    maintenance(false);
    result(3, ResultStateEnum.FINAL);
    due.run();

    // Then
    assertThat(pending).isEmpty();
    verifyNoInteractions(provider);
    assertThat(inbox.page(new NotificationContext(FOLLOWER), null).entries()).isEqualTo(ordinary);
    assertThat(inbox.page(new NotificationContext(OTHER), null).entries()).isEqualTo(operator);
    mvc.perform(get("/accounts/" + FOLLOWER + "/notifications").with(principal(FOLLOWER)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.notifications[0].id").value(ordinary.getFirst().id().toString()));

    // When: a genuinely new match uses the current audience, with no skipped backlog attached.
    follows.replace(
        new FollowContext(
            OTHER, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool())),
        false);
    UUID nextMatch = nextMatch(4);
    when(provider.send(any()))
        .thenAnswer(
            invocation -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              List<Message> messages = invocation.getArgument(0);
              return messages.stream().map(message -> new Outcome(Status.UNKNOWN, null)).toList();
            });
    acceptResult(nextMatch, 5);
    assertThat(pending).hasSize(1);
    runPending();

    // Then
    ArgumentCaptor<List<Message>> sent = ArgumentCaptor.captor();
    verify(provider).send(sent.capture());
    assertThat(sent.getValue())
        .singleElement()
        .satisfies(
            message -> {
              assertThat(message.ownerAccountId()).isEqualTo(FOLLOWER);
              assertThat(message.matchId()).isEqualTo(nextMatch);
              assertThat(message.notificationId()).isNotEqualTo(ordinary.getFirst().id());
            });
    assertThat(inbox.page(new NotificationContext(OTHER), null).entries()).isEqualTo(operator);
    assertThat(count("notification")).isEqualTo(3);
    assertThat(pending).isEmpty();
    verifyNoMoreInteractions(provider);
  }

  @Test
  @DisplayName("Expires and purges maintenance allocations without resurrection on reopening")
  void preservesPurgedAbsence() throws Exception {
    // Given
    follow(FOLLOWER);
    destination(FOLLOWER, 1);
    maintenance(true);
    result(2, ResultStateEnum.FINAL);
    Entry original = inbox.page(new NotificationContext(FOLLOWER), null).entries().getFirst();
    runPending();
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(29)).minusNanos(1000));
    assertThat(inbox.member(new NotificationContext(FOLLOWER), original.id())).isEqualTo(original);

    // When: logical expiry precedes the ordinary physical cleanup while maintenance stays active.
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(29)));

    // Then
    assertThat(count("notification")).isEqualTo(1);
    assertThat(inbox.summary(new NotificationContext(FOLLOWER)).unreadCount()).isZero();
    assertThatThrownBy(() -> inbox.member(new NotificationContext(FOLLOWER), original.id()))
        .isInstanceOf(NotificationNotFoundException.class);

    // When
    daily.purge();
    maintenance(false);
    result(3, null);
    result(4, ResultStateEnum.FINAL);
    due.run();

    // Then
    assertThat(count("notification")).isZero();
    assertThat(inbox.page(new NotificationContext(FOLLOWER), null).entries()).isEmpty();
    assertThat(
            sql.queryForObject(
                "SELECT result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
    mvc.perform(
            get("/accounts/" + FOLLOWER + "/notifications/" + original.id())
                .with(principal(FOLLOWER)))
        .andExpect(status().isNotFound());
    assertThat(pending).isEmpty();
    verifyNoInteractions(provider);
  }

  @Test
  @DisplayName("An admitted batch can finish while the next handoff observes activated maintenance")
  void stopsNewHandoffsAfterAdmission() throws Exception {
    // Given: one committed event has two provider batches under F07's native 100-target bound.
    follow(FOLLOWER);
    for (int number = 1; number <= 101; number++) {
      destination(FOLLOWER, number);
    }
    when(provider.send(any()))
        .thenAnswer(
            invocation -> {
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              maintenance(true);
              List<Message> messages = invocation.getArgument(0);
              return messages.stream()
                  .map(message -> new Outcome(Status.ACCEPTED, "ticket-" + message.target().id()))
                  .toList();
            });
    when(provider.receipts(any())).thenReturn(Map.of());

    // When
    result(2, ResultStateEnum.FINAL);
    assertThat(pending).hasSize(2);
    runPending();

    // Then: the admitted call returns success; the second batch performs a fresh F12 read.
    ArgumentCaptor<List<Message>> sent = ArgumentCaptor.captor();
    verify(provider).send(sent.capture());
    assertThat(sent.getValue()).hasSize(100);
    assertThat(count("notification")).isEqualTo(1);
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true));
    ArgumentCaptor<Runnable> receipt = ArgumentCaptor.forClass(Runnable.class);
    verify(receiptScheduler).schedule(receipt.capture(), any(Instant.class));

    // When: observing the already admitted success is allowed during maintenance, without resend.
    receipt.getValue().run();

    // Then
    verify(provider).receipts(any());

    // When
    maintenance(false);
    result(3, ResultStateEnum.FINAL);
    due.run();

    // Then
    assertThat(pending).isEmpty();
    verifyNoMoreInteractions(provider);
    assertThat(count("notification")).isEqualTo(1);
  }

  /**
   * Exercises the actual generated management read/activation and complete public response.
   *
   * @param active explicit desired maintenance state, never a toggle
   * @throws Exception if the production HTTP boundary refuses or returns invalid JSON
   */
  private void maintenance(boolean active) throws Exception {
    String current =
        mvc.perform(get("/administration/maintenance").with(principal(AUTHOR)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    long revision = json.readTree(current).path("revision").asLong();
    mvc.perform(
            put("/administration/maintenance/activation")
                .with(principal(AUTHOR))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":" + revision + ",\"active\":" + active + "}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.active").value(active));
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(active));
  }

  /**
   * Registers a synthetic destination through F07's real account-lock/association owner.
   *
   * @param owner explicit original recipient
   * @param number stable installation/sign-in/address suffix in this isolated scenario
   */
  private void destination(UUID owner, int number) {
    UUID id = UUID.fromString("00000000-0272-4000-8000-" + String.format("%012d", number));
    subscriptions.replace(
        new Registration(id, id, owner, "ExponentPushToken[maintenance272-" + number + "]"));
  }

  /** Executes and consumes each captured production after-commit task once, in submission order. */
  private void runPending() {
    List<Runnable> work = List.copyOf(pending);
    pending.clear();
    work.forEach(Runnable::run);
  }

  /**
   * Adds a genuinely new known match through F02's current calendar owner, retaining the first.
   *
   * @param ordinal next attributable source order
   * @return newly established sporting UUID before its first final result
   */
  private UUID nextMatch(long ordinal) {
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(ordinal),
            true,
            List.of(
                candidate("M1", "Home", LocalDate.of(2026, 10, 24)),
                candidate("M2", "Next home", LocalDate.of(2026, 10, 24))),
            List.of(),
            List.of()));
    return sql.queryForObject("SELECT id FROM sporting_match WHERE reference='M2'", UUID.class);
  }

  /**
   * Accepts the new match's final result through the actual F02 transactional producer.
   *
   * @param match established current match
   * @param ordinal next attributable source order
   */
  private void acceptResult(UUID match, long ordinal) {
    matches.detail(
        new MatchObservation(
            match,
            context(ordinal),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(3)
                            .awaySets(1)))));
  }

  /**
   * Supplies validated synthetic claims matching ContributionScenario's existing account rows.
   *
   * @param owner explicit original business account
   * @return native Spring Security principal for this request only
   */
  private static RequestPostProcessor principal(UUID owner) {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject(owner.toString())
                    .claim("azp", "mobile-test"));
  }
}
