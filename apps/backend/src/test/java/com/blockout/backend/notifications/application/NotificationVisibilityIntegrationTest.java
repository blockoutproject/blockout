package com.blockout.backend.notifications.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.notifications.api.NotificationApiMapper;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.notifications.application.PushProvider.Outcome;
import com.blockout.backend.notifications.application.PushProvider.Status;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real admitted F02 transitions, F03/F08 reads and PostgreSQL; only clock/provider are controlled.
 */
@DisplayName("Notification current-owner visibility")
class NotificationVisibilityIntegrationTest extends ContributionScenario {
  private static final NotificationContext OWNER = new NotificationContext(FOLLOWER);
  private static final UUID SUBSCRIPTION = UUID.fromString("00000000-0000-4000-8000-000000000271");
  @Autowired private ReadInbox inbox;
  @Autowired private ReadSportingResources sporting;
  @Autowired private ReadPublicContribution publicLinks;
  @Autowired private NotificationApiMapper transport;
  @Autowired private NotificationStore notifications;
  @Autowired private MarkNotificationRead marks;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ModerateContribution moderation;
  @Autowired private DeliverPush sender;
  @MockitoBean private PushProvider provider;

  @ParameterizedTest
  @ValueSource(strings = {"withdrawn", "division", "dateless", "empty-calendar"})
  @DisplayName("Current owner restrictions exclude inbox, count and remaining sends")
  void excludesRestrictedMatch(String restriction) {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry original = inbox.page(OWNER, null).entries().getFirst();
    Created captured = capture(original);
    Target target = subscription();

    // When
    switch (restriction) {
      case "withdrawn" ->
          calendars.accept(
              scope.pool(),
              new CalendarObservation(
                  context(3),
                  true,
                  List.of(candidate("M2", "Other home", LocalDate.of(2026, 10, 24))),
                  List.of(),
                  List.of()));
      case "empty-calendar" ->
          calendars.accept(
              scope.pool(),
              new CalendarObservation(context(3), true, List.of(), List.of(), List.of()));
      case "dateless" ->
          matches.detail(
              new MatchObservation(
                  matchId,
                  context(3),
                  mapper.toFacts(new MatchFactsInternalRequest()._localDate(null))));
      case "division" -> {
        sql.update(
            "INSERT INTO account_permission(account_id,permission) VALUES (?,'division-lifecycle.manage')",
            AUTHOR);
        divisions.setActive(AUTHOR, SportingIngestionFixture.DIVISION, "0", false);
      }
      default -> throw new IllegalArgumentException(restriction);
    }
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(inbox.page(OWNER, null).entries()).isEmpty();
    assertThat(inbox.summary(OWNER).unreadCount()).isZero();
    assertThat(inbox.summary(OWNER).nextExpiryAt()).isNull();
    assertThatThrownBy(() -> inbox.member(OWNER, original.id()))
        .isInstanceOf(NotificationNotFoundException.class);
    assertThatThrownBy(() -> sporting.match(matchId))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThat(publicLinks.read(matchId)).isEmpty();
    verifyNoInteractions(provider);
    assertThat(count("notification")).isEqualTo(1);
    assertThat(
            new TransactionTemplate(transactions)
                .<MatchAnnouncementFacts>execute(status -> notifications.facts(matchId))
                .resultProcessed())
        .isTrue();
  }

  @Test
  @DisplayName("Season closure alone preserves current history and sending")
  void retainsClosedSeasonHistory() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry original = inbox.page(OWNER, null).entries().getFirst();
    Created captured = capture(original);
    Target target = subscription();
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(status -> seasons.closeCollectionSeason(scope.season()));
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(inbox.page(OWNER, null).entries()).containsExactly(original);
    assertThat(inbox.summary(OWNER).unreadCount()).isEqualTo(1);
    assertThat(sporting.match(matchId).match()).isEqualTo(original.match());
    verify(provider).send(any());
  }

  @Test
  @DisplayName("Current link hold, withdrawal and reactivation preserve the result allocation")
  void projectsCurrentLinkLifecycle() {
    // Given
    moderator(AUTHOR);
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/visibility271", true);
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry initial = inbox.page(OWNER, null).entries().getFirst();
    marks.mark(OWNER, initial.id());
    Entry original = inbox.member(OWNER, initial.id());
    Created captured = capture(original);
    Target target = subscription();
    MatchAnnouncementFacts consumed =
        new TransactionTemplate(transactions)
            .<MatchAnnouncementFacts>execute(status -> notifications.facts(matchId));
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));

    // When: a controlled persisted hold/hiding fixture; actual report-threshold commands remain
    // T046.
    sql.update("UPDATE contribution_version SET state='HIDDEN' WHERE id=?", active.version().id());
    sql.update(
        "UPDATE contribution_state SET report_hold_version_id=? WHERE match_id=?",
        active.version().id(),
        matchId);
    Entry hidden = inbox.member(OWNER, original.id());
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(hidden.publicLink()).isFalse();
    assertThat(transport.text(hidden)).contains("Le lien n’est plus proposé.");
    assertThat(publicLinks.read(matchId)).isEmpty();
    assertThat(sporting.match(matchId).stream()).isNull();
    assertThat(hidden).usingRecursiveComparison().ignoringFields("publicLink").isEqualTo(original);
    assertThat(inbox.summary(OWNER).unreadCount()).isZero();
    verify(provider)
        .send(
            org.mockito.ArgumentMatchers.argThat(
                messages ->
                    messages.size() == 1
                        && messages.getFirst().text().body().contains("Le lien n’est plus proposé.")
                        && !messages.getFirst().text().body().contains("https://")));

    // When
    SubmitContribution.Outcome restored =
        moderation.reactivate(AUTHOR, matchId, active.version().id(), "1");
    Entry reappeared = inbox.member(OWNER, original.id());
    assertThat(reappeared).isEqualTo(original);
    assertThat(publicLinks.read(matchId).orElseThrow().contributionId())
        .isEqualTo(restored.version().id());
    moderation.change(
        AUTHOR,
        matchId,
        restored.version().id(),
        restored.revision(),
        StreamModerationActionEnum.WITHDRAW);

    // Then
    assertThat(inbox.member(OWNER, original.id()).publicLink()).isFalse();
    assertThat(sporting.match(matchId).stream()).isNull();
    assertThat(count("notification")).isEqualTo(1);
    assertThat(
            new TransactionTemplate(transactions)
                .<MatchAnnouncementFacts>execute(status -> notifications.facts(matchId)))
        .isEqualTo(consumed);
  }

  @Test
  @DisplayName(
      "Result corrections and sporting reappearance preserve identity, read, editorial choice and age")
  void retainsOriginalAllocation() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry initial = inbox.page(OWNER, null).entries().getFirst();
    marks.mark(OWNER, initial.id());
    Entry original = inbox.member(OWNER, initial.id());
    Created captured = capture(original);
    Target target = subscription();
    when(provider.send(any())).thenReturn(List.of(new Outcome(Status.UNKNOWN, null)));
    calendars.accept(
        scope.pool(), new CalendarObservation(context(3), true, List.of(), List.of(), List.of()));
    assertThat(inbox.page(OWNER, null).entries()).isEmpty();

    // When
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(4),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 24))),
            List.of(),
            List.of()));
    matches.detail(
        new MatchObservation(
            matchId,
            context(5),
            mapper.toFacts(
                new MatchFactsInternalRequest()
                    .result(
                        new MatchResultInternalRequest(ResultStateEnum.FINAL)
                            .homeSets(1)
                            .awaySets(3)))));
    Entry corrected = inbox.member(OWNER, original.id());
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(corrected).usingRecursiveComparison().ignoringFields("match").isEqualTo(original);
    assertThat(transport.text(corrected)).contains("1–3").doesNotContain("3–1");
    assertThat(count("notification")).isEqualTo(1);
    assertThat(inbox.summary(OWNER).unreadCount()).isZero();
    verify(provider)
        .send(
            org.mockito.ArgumentMatchers.argThat(
                messages ->
                    messages.size() == 1
                        && messages.getFirst().text().body().contains("1–3")
                        && !messages.getFirst().text().body().contains("3–1")));
  }

  @Test
  @DisplayName("Result restoration never recreates a purged allocation or resets consumed facts")
  void preservesPurgedAbsence() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry original = inbox.page(OWNER, null).entries().getFirst();
    Created captured = capture(original);
    Target target = subscription();
    MatchAnnouncementFacts consumed =
        new TransactionTemplate(transactions)
            .<MatchAnnouncementFacts>execute(status -> notifications.facts(matchId));
    sql.update("DELETE FROM notification WHERE id=?", original.id());

    // When
    result(3, null);
    result(4, ResultStateEnum.FINAL);
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(inbox.page(OWNER, null).entries()).isEmpty();
    assertThat(inbox.summary(OWNER).unreadCount()).isZero();
    assertThat(count("notification")).isZero();
    assertThat(
            new TransactionTemplate(transactions)
                .<MatchAnnouncementFacts>execute(status -> notifications.facts(matchId)))
        .isEqualTo(consumed);
    verifyNoInteractions(provider);
  }

  @Test
  @DisplayName("A sporting reappearance cannot renew the original twenty-nine-day lifetime")
  void excludesExpiredReappearance() {
    // Given
    follow(FOLLOWER);
    result(2, ResultStateEnum.FINAL);
    Entry original = inbox.page(OWNER, null).entries().getFirst();
    Created captured = capture(original);
    Target target = subscription();
    calendars.accept(
        scope.pool(), new CalendarObservation(context(3), true, List.of(), List.of(), List.of()));

    // When
    calendars.accept(
        scope.pool(),
        new CalendarObservation(
            context(4),
            true,
            List.of(candidate("M1", "Home", LocalDate.of(2026, 10, 24))),
            List.of(),
            List.of()));
    when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(29)));
    sender.deliver(List.of(new DeliverPush.Attempt(captured, target)));

    // Then
    assertThat(inbox.page(OWNER, null).entries()).isEmpty();
    assertThat(inbox.summary(OWNER).unreadCount()).isZero();
    assertThatThrownBy(() -> inbox.member(OWNER, original.id()))
        .isInstanceOf(NotificationNotFoundException.class);
    verifyNoInteractions(provider);
    assertThat(count("notification")).isEqualTo(1);
    assertThat(
            sql.queryForObject(
                    "SELECT created_at FROM notification WHERE id=?",
                    java.sql.Timestamp.class,
                    original.id())
                .toInstant())
        .isEqualTo(original.createdAt());
  }

  /**
   * Captures the real original F06 relation and persisted entry for a delayed send.
   *
   * @param entry original allocation with its stable family, variant and creation instant
   * @return original immutable handoff context, without current sporting text
   */
  private Created capture(Entry entry) {
    UUID relation =
        sql.queryForObject(
            "SELECT id FROM pool_follow WHERE account_id=? AND pool_id=?",
            UUID.class,
            FOLLOWER,
            scope.pool());
    return new Created(
        new AllocateAnnouncements.Entry(
            entry.id(), FOLLOWER, matchId, entry.family(), entry.variant(), entry.createdAt()),
        Set.of(
            new FollowContext.Relation(
                relation,
                FOLLOWER,
                new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool()))));
  }

  /**
   * Installs only this suite's synthetic destination; no provider credentials or real delivery.
   *
   * @return exact current association to exercise the ordinary pre-handoff selection
   */
  private Target subscription() {
    sql.update(
        "INSERT INTO push_subscription(id,subscription_id,installation_id,account_id,expo_push_token,revision) VALUES (?,?,?,?,?,0)",
        SUBSCRIPTION,
        SUBSCRIPTION,
        SUBSCRIPTION,
        FOLLOWER,
        "ExponentPushToken[visibility271]");
    return new Target(SUBSCRIPTION, 0, "ExponentPushToken[visibility271]");
  }
}
