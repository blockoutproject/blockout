package com.blockout.backend.notifications.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.DIVISION;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.HOME;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.OTHER;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.POOL;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.notifications.application.InboxViews.Page;
import com.blockout.backend.notifications.application.InboxViews.Summary;
import com.blockout.backend.notifications.testsupport.InboxDatabaseFixture;
import com.blockout.backend.sporting.application.ReadSportingResources;
import jakarta.persistence.EntityManagerFactory;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.hibernate.SessionFactory;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Real owner/sporting/link data with a controlled clock; no purge or provider execution. */
@SpringBootTest
@DisplayName("Current inbox selection on PostgreSQL")
class ReadInboxIntegrationTest {
  @Autowired private ReadInbox reads;
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadSportingResources sporting;
  @Autowired private EntityManagerFactory entityManagerFactory;
  @Autowired private PlatformTransactionManager transactions;
  @MockitoBean private Clock clock;

  /**
   * Binds the suite to its isolated, explicitly migrated PostgreSQL database.
   *
   * @param properties isolated database properties
   * @throws Exception on migration failure
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    InboxDatabaseFixture.register(properties);
    properties.add("spring.jpa.properties.hibernate.generate_statistics", () -> true);
    properties.add(
        "spring.jpa.properties.hibernate.session_factory.statement_inspector",
        () -> ProjectionInspector.class.getName());
  }

  /**
   * Prepares synthetic owning data and the controlled evaluation instant.
   *
   * @throws Exception on fixture failure
   */
  @BeforeEach
  void owners() throws Exception {
    reset(sql);
    when(clock.instant()).thenReturn(NOW);
  }

  /** Releases only this suite's bounded SQL interleaving. */
  @AfterEach
  void clearHook() {
    ProjectionInspector.hook = null;
  }

  @Test
  @DisplayName("Continues through tied timestamps after anchor deletion and a newer insertion")
  void continuesWithoutAnchor() {
    // Given
    List<UUID> expected = new ArrayList<>();
    for (int i = 1; i <= 43; i++) expected.add(entry(sql, i, ACCOUNT, NOW.minusSeconds(60)));
    java.util.Collections.reverse(expected);
    NotificationContext owner = new NotificationContext(ACCOUNT);

    // When
    Page first = reads.page(owner, null);
    UUID anchor = first.entries().getLast().id();
    sql.update("DELETE FROM notification WHERE id=?", anchor);
    entry(sql, 100, ACCOUNT, NOW);
    Page second = reads.page(owner, first.next());
    Page last = reads.page(owner, second.next());

    // Then
    assertThat(first.entries())
        .extracting(Entry::id)
        .containsExactlyElementsOf(expected.subList(0, 20));
    assertThat(second.entries())
        .extracting(Entry::id)
        .containsExactlyElementsOf(expected.subList(20, 40));
    assertThat(last.entries())
        .extracting(Entry::id)
        .containsExactlyElementsOf(expected.subList(40, 43));
    assertThat(last.next()).isNull();
    assertThat(reads.page(owner, null).entries().getFirst().id())
        .isEqualTo(UUID.fromString("10000000-0000-4000-8000-000000000100"));
  }

  @Test
  @DisplayName("Filters hidden and expired newer rows before filling a twenty-entry page")
  void filtersBeforeWindow() {
    // Given
    List<UUID> expected = new ArrayList<>();
    for (int i = 1; i <= 20; i++) expected.add(entry(sql, i, ACCOUNT, NOW.minusSeconds(120)));
    java.util.Collections.reverse(expected);
    for (int i = 21; i <= 45; i++) {
      UUID hidden = entry(sql, i, ACCOUNT, NOW.minusSeconds(60));
      sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", hidden);
    }
    entry(sql, 46, ACCOUNT, NOW.minus(Duration.ofDays(29)));

    // When
    Page page = reads.page(new NotificationContext(ACCOUNT), null);

    // Then
    assertThat(page.entries()).extracting(Entry::id).containsExactlyElementsOf(expected);
    assertThat(page.next()).isNull();
    assertThat(reads.summary(new NotificationContext(ACCOUNT)).unreadCount()).isEqualTo(20);
  }

  @Test
  @DisplayName("Counts unloaded unread entries with the earliest exact 29-day expiry")
  void summarizesAllPages() {
    // Given
    for (int i = 1; i <= 25; i++) entry(sql, i, ACCOUNT, NOW.minusSeconds(i));
    entry(sql, 30, ACCOUNT, NOW.minus(Duration.ofDays(29)).plusNanos(1000));
    entry(sql, 31, ACCOUNT, NOW.minus(Duration.ofDays(29)));
    entry(sql, 32, OTHER, NOW);
    sql.update(
        "UPDATE notification SET is_read=TRUE WHERE id=?",
        UUID.fromString("10000000-0000-4000-8000-000000000001"));

    // When
    Summary summary = reads.summary(new NotificationContext(ACCOUNT));

    // Then
    assertThat(reads.page(new NotificationContext(ACCOUNT), null).entries()).hasSize(20);
    assertThat(summary.unreadCount()).isEqualTo(25);
    assertThat(summary.nextExpiryAt()).isEqualTo(NOW.plusNanos(1000));
    when(clock.instant()).thenReturn(NOW.plusNanos(1000));
    assertThat(reads.summary(new NotificationContext(ACCOUNT)).unreadCount()).isEqualTo(24);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"match", "date", "division", "pool", "calendar", "participation", "team-division"})
  @DisplayName("Applies current sporting restrictions before paging and counting")
  void excludesHidden(String restriction) {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    switch (restriction) {
      case "match" -> sql.update("UPDATE sporting_match SET present=FALSE WHERE id=?", id);
      case "date" -> sql.update("UPDATE sporting_match SET local_date=NULL WHERE id=?", id);
      case "division" ->
          sql.update("UPDATE sporting_division SET active=FALSE WHERE id=?", DIVISION);
      case "pool" -> sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", POOL);
      case "participation" ->
          sql.update("UPDATE sporting_participation SET current=FALSE WHERE team_id=?", HOME);
      case "calendar" ->
          sql.update("UPDATE sporting_pool SET calendar_empty=TRUE WHERE id=?", POOL);
      case "team-division" -> {
        UUID inactive = UUID.fromString("00000000-0000-4000-8000-000000000019");
        sql.update(
            "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Inactive team division',FALSE,'#112233')",
            inactive);
        sql.update("UPDATE sporting_team SET division_id=? WHERE id=?", inactive, HOME);
      }
      default -> throw new IllegalArgumentException();
    }

    // When
    Page page = reads.page(new NotificationContext(ACCOUNT), null);
    Summary summary = reads.summary(new NotificationContext(ACCOUNT));

    // Then
    assertThat(page.entries()).isEmpty();
    assertThat(summary.unreadCount()).isZero();
    assertThat(summary.nextExpiryAt()).isNull();
    assertThatThrownBy(() -> reads.member(new NotificationContext(ACCOUNT), id))
        .isInstanceOf(NotificationNotFoundException.class);
  }

  @Test
  @DisplayName("Reuses F03 presentation and current F08 availability after corrections")
  void projectsCurrentOwners() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    sql.update(
        "UPDATE sporting_team SET manual_name='Équipe corrigée',manual_short_name='EC' WHERE id=?",
        HOME);
    UUID link = UUID.fromString("20000000-0000-4000-8000-000000000001");
    sql.update(
        "INSERT INTO contribution_version(id,match_id,address,platform,state,created_at,quota_participating) VALUES (?,?,'https://youtube.com/watch?v=demo','YOUTUBE','ACTIVE',?,FALSE)",
        link,
        id,
        Timestamp.from(NOW));

    // When
    Entry available = reads.member(new NotificationContext(ACCOUNT), id);

    // Then
    assertThat(available.match()).isEqualTo(sporting.match(id).match());
    assertThat(available.match().home().name()).isEqualTo("Équipe corrigée");
    assertThat(available.publicLink()).isTrue();
    sql.update("UPDATE contribution_version SET state='HIDDEN' WHERE id=?", link);
    sql.update(
        "UPDATE sporting_match SET result_state=NULL,home_sets=NULL,away_sets=NULL WHERE id=?", id);
    Entry corrected = reads.member(new NotificationContext(ACCOUNT), id);
    assertThat(corrected.publicLink()).isFalse();
    assertThat(corrected.match().result()).isNull();
    assertThat(corrected.id()).isEqualTo(available.id());
    assertThat(corrected.createdAt()).isEqualTo(available.createdAt());
    assertThat(corrected.family()).isEqualTo(available.family());
    assertThat(corrected.variant()).isEqualTo(available.variant());
  }

  @Test
  @DisplayName("Keeps multi-query projections in one repeatable-read snapshot")
  void keepsCoherentProjection() {
    // Given
    UUID id = entry(sql, 1, ACCOUNT, NOW);
    TransactionTemplate independent = new TransactionTemplate(transactions);
    independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    AtomicBoolean corrected = new AtomicBoolean();
    ProjectionInspector.hook =
        statement -> {
          String query = statement.toLowerCase(Locale.ROOT);
          if (query.contains("from sporting_match")
              && !query.contains("notification")
              && corrected.compareAndSet(false, true)) {
            independent.executeWithoutResult(
                status -> {
                  sql.update("UPDATE sporting_match SET home_sets=1,away_sets=3 WHERE id=?", id);
                  sql.update("UPDATE sporting_team SET manual_name='New name' WHERE id=?", HOME);
                  sql.update("DELETE FROM notification WHERE id=?", id);
                });
          }
        };

    // When
    Entry before = reads.page(new NotificationContext(ACCOUNT), null).entries().getFirst();

    // Then
    assertThat(corrected).isTrue();
    assertThat(before.match().result().homeSets()).isEqualTo(3);
    assertThat(before.match().home().name()).isEqualTo("Team");
    assertThat(reads.page(new NotificationContext(ACCOUNT), null).entries()).isEmpty();
  }

  @Test
  @DisplayName("Loads twenty distinct matches with a bounded number of sporting/link queries")
  void avoidsPerNotificationQueries() {
    // Given
    for (int i = 1; i <= 20; i++) entry(sql, i, ACCOUNT, NOW.minusSeconds(i));
    org.hibernate.stat.Statistics statistics =
        entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.clear();

    // When
    Page page = reads.page(new NotificationContext(ACCOUNT), null);

    // Then
    assertThat(page.entries()).hasSize(20);
    assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(5);
  }

  @Test
  @DisplayName("A cursor from another owner supplies keys without granting access to its rows")
  void scopesEveryContinuation() {
    // Given
    UUID own = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    UUID foreign = entry(sql, 2, OTHER, NOW);
    InboxViews.Continuation keys = new InboxViews.Continuation(NOW, foreign);

    // When
    Page page = reads.page(new NotificationContext(ACCOUNT), keys);

    // Then
    assertThat(page.entries()).extracting(Entry::id).containsExactly(own);
    assertThatThrownBy(() -> reads.member(new NotificationContext(ACCOUNT), foreign))
        .isInstanceOf(NotificationNotFoundException.class);
  }

  /** Native test hook observes actual statement boundaries without modifying SQL. */
  public static class ProjectionInspector implements StatementInspector {
    private static final long serialVersionUID = 1L;
    private static volatile Consumer<String> hook;
    private final AtomicBoolean inspecting = new AtomicBoolean();

    /** {@inheritDoc} */
    @Override
    public String inspect(String sql) {
      Consumer<String> callback = hook;
      if (callback != null && inspecting.compareAndSet(false, true)) {
        try {
          callback.accept(sql);
        } finally {
          inspecting.set(false);
        }
      }
      return sql;
    }
  }
}
