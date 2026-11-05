package com.blockout.backend.notifications.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarWindow;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

/** Real F02/F08 producers through F06 selection and F07 sending, with controlled worker and I/O. */
@SpringBootTest(
    properties = {
      "blockout.notifications.push.enabled=true",
      "blockout.notifications.push.project-id=00000000-0000-4000-8000-000000000001",
      "blockout.notifications.push.access-token=synthetic-not-a-credential",
      "blockout.notifications.retention-cron=-",
      "blockout.notifications.link-announcements-cron=-"
    })
@DisplayName("Actual producer-to-send consumption of original follows")
class FollowRecipientDeliveryIntegrationTest extends ContributionScenario {
  @Autowired private ReadPersonalCalendar calendar;
  @Autowired private ReadInbox inbox;
  @MockitoBean private PushProvider provider;

  @MockitoBean(name = "pushExecutor")
  private ThreadPoolTaskExecutor executor;

  private List<FollowContext> origins;

  /** Creates three real overlapping follows and one synthetic installation in this suite's DB. */
  @BeforeEach
  void prepareRecipient() {
    origins =
        List.of(
            new FollowContext(FOLLOWER, new Target(TargetType.POOL, scope.pool())),
            new FollowContext(
                FOLLOWER,
                new Target(
                    TargetType.TEAM,
                    sql.queryForObject(
                        "SELECT home_team_id FROM sporting_match WHERE id=?",
                        UUID.class,
                        matchId))),
            new FollowContext(
                FOLLOWER,
                new Target(
                    TargetType.TEAM,
                    sql.queryForObject(
                        "SELECT away_team_id FROM sporting_match WHERE id=?",
                        UUID.class,
                        matchId))));
    for (FollowContext origin : origins) {
      follows.replace(origin, true);
    }
    sql.update(
        "INSERT INTO push_subscription(id,subscription_id,installation_id,account_id,expo_push_token,revision) VALUES (?,?,?,?,?,0)",
        UUID.fromString("00000000-0000-4000-8000-000000000090"),
        UUID.fromString("00000000-0000-4000-8000-000000000091"),
        UUID.fromString("00000000-0000-4000-8000-000000000092"),
        FOLLOWER,
        "ExponentPushToken[synthetic]");
  }

  @ParameterizedTest
  @EnumSource(Producer.class)
  @DisplayName("Overlapping follows send once despite another displayed season")
  void sendsOneRecipientAcrossDisplaySelections(Producer producer) {
    // Given
    UUID otherSeason = otherSeason();
    CalendarWindow window = new CalendarWindow(CalendarCategoryEnum.UPCOMING, ZoneOffset.UTC, null);
    ReadPersonalCalendar.Calendar all = calendar.read(FOLLOWER, null, window);
    ReadPersonalCalendar.Calendar selected = calendar.read(FOLLOWER, otherSeason, window);
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When
    announce(producer);
    ReadPersonalCalendar.Calendar changed = calendar.read(FOLLOWER, scope.season(), window);
    calendar.read(FOLLOWER, otherSeason, window);
    pending().run();

    // Then
    assertThat(all.hasAvailableFollows()).isTrue();
    assertThat(selected.hasAvailableFollows()).isFalse();
    assertThat(changed.hasAvailableFollows()).isTrue();
    assertThat(sql.queryForList("SELECT account_id FROM notification", UUID.class))
        .containsExactly(FOLLOWER);
    assertThat(sql.queryForList("SELECT family FROM notification", String.class))
        .containsExactly(producer == Producer.RESULT ? "PLAIN_RESULT" : "LIVE_LINK");
    ArgumentCaptor<List<Message>> sent = ArgumentCaptor.captor();
    verify(provider).send(sent.capture());
    assertThat(sent.getValue())
        .singleElement()
        .satisfies(
            message -> {
              assertThat(message.ownerAccountId()).isEqualTo(FOLLOWER);
              assertThat(message.matchId()).isEqualTo(matchId);
            });
  }

  @Test
  @DisplayName("A retained original pool still sends after both team follows are recreated")
  void sendsWithSurvivingOriginalPool() {
    // Given
    announce(Producer.RESULT);
    UUID originalPool =
        sql.queryForObject("SELECT id FROM pool_follow WHERE account_id=?", UUID.class, FOLLOWER);
    for (FollowContext origin : origins.subList(1, 3)) {
      follows.replace(origin, false);
      follows.replace(origin, true);
    }
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When
    pending().run();

    // Then
    verify(provider).send(any());
    assertThat(
            sql.queryForObject(
                "SELECT id FROM pool_follow WHERE account_id=?", UUID.class, FOLLOWER))
        .isEqualTo(originalPool);
    assertThat(count("notification")).isEqualTo(1);
  }

  @Test
  @DisplayName("Recreating every origin cancels pending work without renewing consumed facts")
  void refusesRecreatedOrigins() {
    // Given
    announce(Producer.RESULT);
    List<UUID> original =
        sql.queryForList(
            "SELECT id FROM team_follow UNION ALL SELECT id FROM pool_follow", UUID.class);
    for (FollowContext origin : origins) {
      follows.replace(origin, false);
      follows.replace(origin, true);
    }

    // When
    pending().run();
    result(3, ResultStateEnum.FINAL);

    // Then
    verifyNoInteractions(provider);
    assertThat(
            sql.queryForList(
                "SELECT id FROM team_follow UNION ALL SELECT id FROM pool_follow", UUID.class))
        .hasSize(3)
        .doesNotContainAnyElementsOf(original);
    assertThat(count("notification")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT result_processed FROM match_announcement WHERE match_id=?",
                Boolean.class,
                matchId))
        .isTrue();
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  @DisplayName("Current original-account or target disappearance cancels pending handoff")
  void refusesUnavailableOwnerOrTarget(boolean eraseAccount) {
    // Given
    announce(Producer.RESULT);
    if (eraseAccount) {
      for (FollowContext origin : origins) {
        follows.replace(origin, false);
      }
      sql.update("DELETE FROM account WHERE id=?", FOLLOWER);
    } else {
      sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", matchId);
    }

    // When
    pending().run();

    // Then
    verifyNoInteractions(provider);
  }

  @Test
  @DisplayName("A retained team relation cannot send after its team leaves the current match")
  void refusesFormerMatchOrigin() {
    // Given
    announce(Producer.RESULT);
    follows.replace(origins.getFirst(), false);
    follows.replace(origins.getLast(), false);
    UUID replacement = UUID.fromString("00000000-0000-4000-8000-000000000097");
    sql.update(
        "INSERT INTO sporting_team(id,season_id,provider,organizer_reference,competition_reference,native_reference,source_name,comparison_name,club_id,division_id,format,gender) SELECT ?,season_id,provider,organizer_reference,competition_reference,'replacement','Replacement','replacement',club_id,division_id,format,gender FROM sporting_team WHERE id=?",
        replacement,
        origins.get(1).target().id());
    sql.update(
        "INSERT INTO sporting_participation(id,pool_id,team_id,current) VALUES (?,?,?,TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000098"),
        scope.pool(),
        replacement);
    sql.update("UPDATE sporting_match SET home_team_id=? WHERE id=?", replacement, matchId);

    // When
    pending().run();

    // Then
    verifyNoInteractions(provider);
    assertThat(count("notification")).isEqualTo(1);
    UUID notification = sql.queryForObject("SELECT id FROM notification", UUID.class);
    assertThat(inbox.availableMember(new NotificationContext(FOLLOWER), notification))
        .isPresent()
        .get()
        .extracting(entry -> entry.match().home().id())
        .isEqualTo(replacement);
    assertThat(sql.queryForList("SELECT team_id FROM team_follow", UUID.class))
        .containsExactly(origins.get(1).target().id());
  }

  @Test
  @DisplayName("Trigger rereads relation incarnations after waiting on the original account lock")
  void capturesRelationsAfterAccountLock() throws Exception {
    // Given
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> producer =
          transaction.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, FOLLOWER);
                Future<?> waiting =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  result(2, ResultStateEnum.FINAL);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                // The producer holds sporting roots; mutate only this account's relations, in lock
                // order.
                sql.update("DELETE FROM team_follow WHERE account_id=?", FOLLOWER);
                sql.update("DELETE FROM pool_follow WHERE account_id=?", FOLLOWER);
                sql.update(
                    "INSERT INTO pool_follow(id,account_id,pool_id) VALUES (?,?,?)",
                    UUID.fromString("00000000-0000-4000-8000-000000000093"),
                    FOLLOWER,
                    scope.pool());
                return waiting;
              });
      producer.get(15, TimeUnit.SECONDS);
    }
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When
    pending().run();

    // Then
    verify(provider).send(any());
    assertThat(count("notification")).isEqualTo(1);
  }

  /** Real producer entry points qualified by this suite. */
  enum Producer {
    RESULT,
    PUBLICATION,
    DUE_LINK
  }

  /**
   * Commits through the actual sporting, publication or due-pass owner, without fabricating events.
   *
   * @param producer scenario's actual trigger
   */
  private void announce(Producer producer) {
    if (producer == Producer.RESULT) {
      result(2, ResultStateEnum.FINAL);
    } else {
      moderator(AUTHOR);
      if (producer == Producer.DUE_LINK) {
        sql.update(
            "UPDATE sporting_match SET reliable_start=? WHERE id=?",
            Timestamp.from(NOW.plusSeconds(60)),
            matchId);
      }
      submit(AUTHOR, "0", "https://youtube.com/advance", true);
      if (producer == Producer.DUE_LINK) {
        when(clock.instant()).thenReturn(NOW.plusSeconds(90));
        due.run();
      }
    }
  }

  /**
   * Retrieves the single actual after-commit batch while keeping its execution under test control.
   *
   * @return production sender work captured after the real producer commit
   */
  private Runnable pending() {
    ArgumentCaptor<Runnable> work = ArgumentCaptor.forClass(Runnable.class);
    verify(executor).execute(work.capture());
    verifyNoInteractions(provider);
    return work.getValue();
  }

  /**
   * Adds a valid unfollowed catalog season for an actual personal-calendar display selection.
   *
   * @return distinct selectable season with no follows
   */
  private UUID otherSeason() {
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000094");
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000095");
    UUID pool = UUID.fromString("00000000-0000-4000-8000-000000000096");
    sql.update(
        "INSERT INTO sporting_season(id,start_year,label) VALUES (?,2025,'2025/2026')", season);
    sql.update(
        "INSERT INTO sporting_pack(id,season_id,provider,organizer_reference,reference) SELECT ?,?,provider,organizer_reference,'other-pack' FROM sporting_pack WHERE id=(SELECT pack_id FROM sporting_pool WHERE id=?)",
        pack,
        season,
        scope.pool());
    sql.update(
        "INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,competition_reference,reference,source_name,division_id,format,gender) SELECT ?,?,?,provider,organizer_reference,competition_reference,'other-pool',source_name,division_id,format,gender FROM sporting_pool WHERE id=?",
        pool,
        season,
        pack,
        scope.pool());
    return season;
  }
}
