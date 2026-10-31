package com.blockout.backend.accounts.application;

import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.ACCOUNT;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.AWAY;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.HOME;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.NOW;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.POOL;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.entry;
import static com.blockout.backend.notifications.testsupport.InboxDatabaseFixture.reset;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.notifications.application.InboxViews;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.ReadInbox;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Qualifies fresh F14 target state through real F05/F06/F07/F12 services and migrated PostgreSQL.
 * Only principal evidence and time are controlled; HTTP requests use Spring Security test JWTs.
 * Fixture cleanup is not a transition or account-erasure implementation. External F10 cases and
 * F05/F11 privacy obligations remain independently applicable and are not erased by these checks.
 * Native credentials, private-cache callbacks and provider continuity need their owning evidence.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Fresh transition accounts and original-owner isolation")
class TransitionResetIntegrationTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final String SUBJECT_A = "auth0|transition-a";
  private static final String SUBJECT_B = "auth0|transition-b";
  private static final String EMAIL = "shared@example.invalid";
  private static final Instant PRINCIPAL_CREATED = Instant.parse("2020-01-02T03:04:05Z");
  private static final UUID OLD_REFERENCE = UUID.fromString("00000000-0000-4000-8000-000000000299");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private EstablishAccount establishment;
  @Autowired private ReadAccount accounts;
  @Autowired private FollowState follows;
  @Autowired private ReadFollowLists lists;
  @Autowired private ReadInbox inbox;
  @Autowired private MockMvc mvc;
  @MockitoBean private PrincipalReader provider;
  @MockitoBean private Clock clock;

  /**
   * Reuses the maintained synthetic fixture in this context's disposable migrated database.
   *
   * @throws Exception if isolated fixture preparation fails
   */
  @BeforeEach
  void prepare() throws Exception {
    reset(database, sql);
    when(clock.instant()).thenReturn(NOW);
  }

  @Test
  @DisplayName("Establishes a neutral fresh profile without another owner's personal state")
  void establishesFreshPersonalState() throws Exception {
    // Given
    // These synthetic bytes exercise another owner's stored-photo presence, not image validation.
    sql.update(
        "UPDATE account SET username='Former_profile', email=?, photo_bytes=?,"
            + " photo_media_type='image/png', photo_dimension=1 WHERE id=?",
        EMAIL,
        new byte[] {1, 2, 3},
        ACCOUNT);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,'maintenance.manage')",
        ACCOUNT);
    follows.replace(new FollowContext(ACCOUNT, new Target(TargetType.TEAM, HOME)), true);
    follows.replace(new FollowContext(ACCOUNT, new Target(TargetType.POOL, POOL)), true);
    UUID foreignNotification = entry(sql, 1, ACCOUNT, NOW.minusSeconds(60));
    when(provider.read(ISSUER, SUBJECT_A))
        .thenReturn(new PrincipalReader.Evidence(EMAIL, PRINCIPAL_CREATED, List.of()));

    // When
    EstablishAccount.Outcome outcome = establishment.establish(ISSUER, SUBJECT_A);

    // Then
    Account fresh = outcome.view().account();
    assertThat(outcome.created()).isTrue();
    assertThat(fresh.id()).isNotIn(ACCOUNT, OLD_REFERENCE);
    assertThat(fresh.username()).matches("[A-Za-z0-9._-]{3,32}").isNotEqualTo("Former_profile");
    assertThat(fresh.email()).isEqualTo(EMAIL);
    assertThat(fresh.principalCreatedAt()).isEqualTo(PRINCIPAL_CREATED);
    assertThat(outcome.view().hasPhoto()).isFalse();
    assertThat(outcome.view().permissions()).isEmpty();
    assertThat(accounts.current(ISSUER, SUBJECT_A)).isEqualTo(outcome.view());
    assertFreshPersonalReads(fresh.id());
    assertThat(lists.teams(ACCOUNT, null, 0).items()).hasSize(1);
    assertThat(lists.pools(ACCOUNT, null, 0).items()).hasSize(1);
    assertThat(inbox.summary(new NotificationContext(ACCOUNT)).unreadCount()).isEqualTo(1);
    assertThat(inbox.member(new NotificationContext(ACCOUNT), foreignNotification).read())
        .isFalse();
    mvc.perform(get("/accounts/me").with(principal(SUBJECT_A)))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.accountId").value(fresh.id().toString()))
        .andExpect(jsonPath("$.hasPhoto").value(false))
        .andExpect(jsonPath("$.permissions.manageMaintenance").value(false))
        .andExpect(jsonPath("$.permissions.bypassMaintenance").value(false))
        .andExpect(jsonPath("$.permissions.moderateStreamLinks").value(false));
  }

  @Test
  @DisplayName("Accepts a voluntary team follow only for its exact sporting identity")
  void followsOnlyChosenTeam() {
    // Given
    sql.update(
        "UPDATE sporting_team SET source_name='Same sporting name' WHERE id IN (?, ?)", HOME, AWAY);
    when(provider.read(ISSUER, SUBJECT_A))
        .thenReturn(new PrincipalReader.Evidence(EMAIL, PRINCIPAL_CREATED, List.of()));
    Account owner = establishment.establish(ISSUER, SUBJECT_A).view().account();
    FollowContext selected = new FollowContext(owner.id(), new Target(TargetType.TEAM, HOME));
    assertThat(follows.read(selected)).isFalse();

    // When
    boolean confirmed = follows.replace(selected, true);

    // Then
    assertThat(confirmed).isTrue();
    assertThat(lists.teams(owner.id(), null, 0).items())
        .extracting(item -> item.team().id())
        .containsExactly(HOME);
    assertThat(follows.read(new FollowContext(owner.id(), new Target(TargetType.TEAM, AWAY))))
        .isFalse();
    assertThat(lists.pools(owner.id(), null, 0).items()).isEmpty();
    assertThat(inbox.summary(new NotificationContext(owner.id())).unreadCount()).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM team_follow WHERE account_id=? AND team_id=?",
                Long.class,
                owner.id(),
                HOME))
        .isEqualTo(1L);
  }

  @Test
  @DisplayName("Accepts a voluntary pool follow without creating team follows")
  void followsOnlyChosenPool() {
    // Given
    when(provider.read(ISSUER, SUBJECT_A))
        .thenReturn(new PrincipalReader.Evidence(EMAIL, PRINCIPAL_CREATED, List.of()));
    Account owner = establishment.establish(ISSUER, SUBJECT_A).view().account();
    FollowContext selected = new FollowContext(owner.id(), new Target(TargetType.POOL, POOL));
    assertThat(follows.read(selected)).isFalse();

    // When
    boolean confirmed = follows.replace(selected, true);

    // Then
    assertThat(confirmed).isTrue();
    assertThat(lists.pools(owner.id(), null, 0).items())
        .extracting(item -> item.pool().id())
        .containsExactly(POOL);
    assertThat(lists.teams(owner.id(), null, 0).items()).isEmpty();
    assertThat(inbox.summary(new NotificationContext(owner.id())).unreadCount()).isZero();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM pool_follow WHERE account_id=? AND pool_id=?",
                Long.class,
                owner.id(),
                POOL))
        .isEqualTo(1L);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Refuses an absent old target without selecting a similar rebuilt resource")
  void refusesOldSportingReference(TargetType type) {
    // Given
    when(provider.read(ISSUER, SUBJECT_A))
        .thenReturn(new PrincipalReader.Evidence(EMAIL, PRINCIPAL_CREATED, List.of()));
    Account owner = establishment.establish(ISSUER, SUBJECT_A).view().account();
    FollowContext old = new FollowContext(owner.id(), new Target(type, OLD_REFERENCE));

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable follow = () -> follows.replace(old, true);

    // Then
    assertThatThrownBy(follow).isInstanceOf(FollowUnavailableTargetException.class);
    assertFreshPersonalReads(owner.id());
  }

  @Test
  @DisplayName("Keeps original private resources isolated through A, guest, B and return to A")
  void isolatesOriginalOwnersAcrossRequests() throws Exception {
    // Given
    PrincipalReader.Evidence evidence =
        new PrincipalReader.Evidence(EMAIL, PRINCIPAL_CREATED, List.of());
    when(provider.read(ISSUER, SUBJECT_A)).thenReturn(evidence);
    when(provider.read(ISSUER, SUBJECT_B)).thenReturn(evidence);
    Account first = establishment.establish(ISSUER, SUBJECT_A).view().account();
    Account second = establishment.establish(ISSUER, SUBJECT_B).view().account();
    assertThat(second.id()).isNotEqualTo(first.id());
    follows.replace(new FollowContext(first.id(), new Target(TargetType.TEAM, HOME)), true);
    follows.replace(new FollowContext(second.id(), new Target(TargetType.TEAM, AWAY)), true);
    UUID firstNotification = entry(sql, 2, first.id(), NOW.minusSeconds(60));
    UUID secondNotification = entry(sql, 3, second.id(), NOW.minusSeconds(30));

    // When
    mvc.perform(get("/accounts/me").with(principal(SUBJECT_A)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(first.id().toString()));
    mvc.perform(get("/accounts/me")).andExpect(status().isUnauthorized());
    mvc.perform(get("/accounts/{id}/notifications", first.id()))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/accounts/{id}/team-follows", first.id()))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/accounts/me").with(principal(SUBJECT_B)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(second.id().toString()));
    mvc.perform(get("/accounts/{id}", first.id()).with(principal(SUBJECT_B)))
        .andExpect(status().isNotFound());
    mvc.perform(get("/accounts/{id}/notifications", first.id()).with(principal(SUBJECT_B)))
        .andExpect(status().isNotFound());
    mvc.perform(
            put("/accounts/{id}/team-follows/{team}", first.id(), HOME)
                .with(principal(SUBJECT_B))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"following\":false}"))
        .andExpect(status().isNotFound());
    mvc.perform(
            patch("/accounts/{id}/notifications/{notification}", first.id(), firstNotification)
                .with(principal(SUBJECT_B))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"read\":true}"))
        .andExpect(status().isNotFound());
    mvc.perform(
            get("/accounts/{id}/notifications/{notification}", second.id(), firstNotification)
                .with(principal(SUBJECT_B)))
        .andExpect(status().isNotFound());

    // Then
    mvc.perform(get("/accounts/me").with(principal(SUBJECT_A)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(first.id().toString()));
    assertThat(lists.teams(first.id(), null, 0).items())
        .extracting(item -> item.team().id())
        .containsExactly(HOME);
    assertThat(lists.teams(second.id(), null, 0).items())
        .extracting(item -> item.team().id())
        .containsExactly(AWAY);
    assertThat(inbox.page(new NotificationContext(first.id()), null).entries())
        .extracting(InboxViews.Entry::id)
        .containsExactly(firstNotification);
    assertThat(inbox.page(new NotificationContext(second.id()), null).entries())
        .extracting(InboxViews.Entry::id)
        .containsExactly(secondNotification);
    assertThat(inbox.member(new NotificationContext(first.id()), firstNotification).read())
        .isFalse();
    assertThat(inbox.summary(new NotificationContext(first.id())).unreadCount()).isEqualTo(1);
    assertThat(inbox.summary(new NotificationContext(second.id())).unreadCount()).isEqualTo(1);
  }

  /**
   * Checks completed owner reads and persisted absence rather than claiming pending restoration.
   *
   * @param owner newly established original business account
   */
  private void assertFreshPersonalReads(UUID owner) {
    ReadFollowLists.Teams teams = lists.teams(owner, null, 0);
    ReadFollowLists.Pools pools = lists.pools(owner, null, 0);
    InboxViews.Page notifications = inbox.page(new NotificationContext(owner), null);
    InboxViews.Summary summary = inbox.summary(new NotificationContext(owner));
    assertThat(teams.items()).isEmpty();
    assertThat(teams.nextPage()).isNull();
    assertThat(pools.items()).isEmpty();
    assertThat(pools.nextPage()).isNull();
    assertThat(notifications.entries()).isEmpty();
    assertThat(notifications.next()).isNull();
    assertThat(summary.unreadCount()).isZero();
    assertThat(summary.nextExpiryAt()).isNull();
    assertThat(
            sql.queryForObject(
                "SELECT (SELECT COUNT(*) FROM team_follow WHERE account_id=?) + (SELECT COUNT(*)"
                    + " FROM pool_follow WHERE account_id=?) + (SELECT COUNT(*) FROM notification"
                    + " WHERE account_id=?) + (SELECT COUNT(*) FROM account_permission WHERE"
                    + " account_id=?)",
                Long.class,
                owner,
                owner,
                owner,
                owner))
        .isZero();
  }

  /**
   * Supplies an exact test principal with obsolete claims that confer no current business grants.
   *
   * @param subject exact authenticated principal, independent from its shared email
   * @return Spring Security test authentication; signature validation has its dedicated suite
   */
  private static RequestPostProcessor principal(String subject) {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer(ISSUER)
                    .subject(subject)
                    .claim("azp", "mobile-test")
                    .claim("roles", List.of("administrator"))
                    .claim("permissions", List.of("maintenance.manage")));
  }
}
