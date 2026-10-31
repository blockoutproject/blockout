package com.blockout.backend.accounts.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.infrastructure.ProfilePhotoProcessor;
import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.notifications.application.ChangePushSubscriptions;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockPart;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Real F05/F06/F07/F08/F12 owners on migrated PostgreSQL, with controlled provider I/O and time.
 * Spies pause actual operations for ordering; SQL state establishes effects, not method calls.
 * Spring Security test principals do not qualify real tokens, native sessions or provider cleanup.
 */
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@AutoConfigureMockMvc
@DisplayName("Atomic original-account erasure")
class EraseAccountIntegrationTest extends ContributionScenario {
  private static final UUID CONNECTION = UUID.fromString("10000000-0000-4000-8000-000000000280");
  private static final UUID INSTALLATION = UUID.fromString("20000000-0000-4000-8000-000000000280");
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private EraseAccount erasure;
  @MockitoSpyBean private AccountStore accounts;
  @Autowired private AccountAccess locks;
  @Autowired private ChangeAccountProfile profiles;
  @Autowired private ChangePushSubscriptions destinations;
  @Autowired private ReportContribution reports;
  @Autowired private ModerateContribution moderation;
  @Autowired private ReadAccount readsAccount;
  @Autowired private MockMvc mvc;
  @MockitoSpyBean private ProfilePhotoProcessor photos;
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
    destinations.replace(new Registration(CONNECTION, INSTALLATION, FOLLOWER, "Expo[original]"));
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
    assertThat(accounts.hasPhoto(FOLLOWER)).isFalse();
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
    ProfilePhoto originalPhoto = photos.prepare(png(8), "image/png");
    profiles.change(
        ISSUER,
        FOLLOWER.toString(),
        FOLLOWER,
        "Retained",
        ProfilePhotoActionEnum.REPLACE,
        originalPhoto);
    follow(FOLLOWER);
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/facts", false);
    reports.report(FOLLOWER, active.version().id(), "Synthetic private reason");
    destinations.replace(new Registration(CONNECTION, INSTALLATION, FOLLOWER, "Expo[original]"));
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
        assertThat(accounts.findById(FOLLOWER).orElseThrow().username()).isEqualTo("Retained");
        assertThat(readsAccount.photo(ISSUER, FOLLOWER.toString(), FOLLOWER).bytes())
            .isEqualTo(originalPhoto.bytes());
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
  @ValueSource(
      strings = {"profile", "photo-replace", "photo-remove", "follow", "destination", "grant"})
  @DisplayName("A real writer commits first and erasure removes its accepted effects")
  void removesWriterThatCommitsFirst(String writer) throws Exception {
    // Given
    ProfilePhoto photo = photos.prepare(png(8), "image/png");
    profiles.change(
        ISSUER,
        FOLLOWER.toString(),
        FOLLOWER,
        null,
        ProfilePhotoActionEnum.REPLACE,
        photos.prepare(png(4), "image/png"));
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
                      case "photo-replace", "photo-remove" ->
                          profiles.change(
                              ISSUER,
                              FOLLOWER.toString(),
                              FOLLOWER,
                              "PhotoWriter",
                              writer.equals("photo-replace")
                                  ? ProfilePhotoActionEnum.REPLACE
                                  : ProfilePhotoActionEnum.REMOVE,
                              writer.equals("photo-replace") ? photo : null);
                      case "follow" -> follow(FOLLOWER);
                      case "destination" ->
                          destinations.replace(
                              new Registration(CONNECTION, INSTALLATION, FOLLOWER, "Expo[race]"));
                      case "grant" -> moderator(FOLLOWER);
                      default -> throw new IllegalArgumentException(writer);
                    }
                    if (writer.startsWith("photo-")) {
                      assertThat(
                              readsAccount
                                  .original(ISSUER, FOLLOWER.toString(), FOLLOWER)
                                  .account()
                                  .username())
                          .isEqualTo("PhotoWriter");
                      assertThat(accounts.hasPhoto(FOLLOWER))
                          .isEqualTo(writer.equals("photo-replace"));
                      if (writer.equals("photo-replace"))
                        assertThat(
                                readsAccount.photo(ISSUER, FOLLOWER.toString(), FOLLOWER).bytes())
                            .isEqualTo(photo.bytes());
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
    assertThat(accounts.hasPhoto(FOLLOWER)).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM account_permission WHERE account_id=?", Long.class, FOLLOWER))
        .isZero();
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
  @ValueSource(
      strings = {"profile", "photo-replace", "photo-remove", "follow", "destination", "grant"})
  @DisplayName("A real writer ordered after erasure cannot resurrect an association")
  void rejectsWriterAfterErasure(String writer) throws Exception {
    // Given
    ProfilePhoto photo = photos.prepare(png(8), "image/png");
    profiles.change(
        ISSUER,
        FOLLOWER.toString(),
        FOLLOWER,
        null,
        ProfilePhotoActionEnum.REPLACE,
        photos.prepare(png(4), "image/png"));
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
                              case "photo-replace", "photo-remove" ->
                                  profiles.change(
                                      ISSUER,
                                      FOLLOWER.toString(),
                                      FOLLOWER,
                                      "TooLatePhoto",
                                      writer.equals("photo-replace")
                                          ? ProfilePhotoActionEnum.REPLACE
                                          : ProfilePhotoActionEnum.REMOVE,
                                      writer.equals("photo-replace") ? photo : null);
                              case "follow" -> follow(FOLLOWER);
                              case "destination" ->
                                  destinations.replace(
                                      new Registration(
                                          CONNECTION, INSTALLATION, FOLLOWER, "Expo[late]"));
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
            case "destination" ->
                com.blockout.backend.notifications.application.NotificationNotFoundException.class;
            default -> AccountNotFoundException.class;
          };
      assertThatThrownBy(() -> writing.get(10, TimeUnit.SECONDS)).hasCauseInstanceOf(refusal);
      assertThat(accounts.findById(FOLLOWER)).isEmpty();
      assertThat(accounts.hasPhoto(FOLLOWER)).isFalse();
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
  @DisplayName("A prepared original photo cannot overwrite the recreated account through HTTP")
  void rejectsPreparedPhotoAfterReturn() throws Exception {
    // Given
    when(auth0.remove(any(), any())).thenReturn(AccountCleanup.Outcome.REMOVED);
    when(revenueCat.remove(any())).thenReturn(AccountCleanup.Outcome.QUEUED);
    when(principal.read(ISSUER, FOLLOWER.toString()))
        .thenReturn(new PrincipalReader.Evidence("returned@example.invalid", NOW, List.of()));
    ProfilePhoto newPhoto = photos.prepare(png(16), "image/png");
    MockMultipartHttpServletRequestBuilder request =
        profilePatch(FOLLOWER, "{\"username\":\"TooLatePhoto\",\"photoAction\":\"replace\"}");
    MockPart image = new MockPart("image", "original.png", png(8));
    image.getHeaders().setContentType(MediaType.IMAGE_PNG);
    request.part(image);
    CompletableFuture<Void> prepared = new CompletableFuture<>();
    CompletableFuture<Void> proceed = new CompletableFuture<>();
    doAnswer(
            call -> {
              Object accepted = call.callRealMethod();
              assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
              prepared.complete(null);
              proceed.get(10, TimeUnit.SECONDS);
              return accepted;
            })
        .when(photos)
        .prepare(any(), any());
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<?> writing =
          worker.submit(() -> mvc.perform(request).andExpect(status().isNotFound()));
      try {
        prepared.get(10, TimeUnit.SECONDS);
        erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
        UUID replacement =
            establishment.establish(ISSUER, FOLLOWER.toString()).view().account().id();
        // This replacement's actual US2 pixels differ from the original prepared image.
        profiles.change(
            ISSUER,
            FOLLOWER.toString(),
            replacement,
            "ReturnedPhoto",
            ProfilePhotoActionEnum.REPLACE,
            newPhoto);

        // When
        proceed.complete(null);
        writing.get(10, TimeUnit.SECONDS);

        // Then
        assertThat(replacement).isNotEqualTo(FOLLOWER);
        assertThat(readsAccount.current(ISSUER, FOLLOWER.toString()).account().username())
            .isEqualTo("ReturnedPhoto");
        assertThat(readsAccount.photo(ISSUER, FOLLOWER.toString(), replacement).bytes())
            .isEqualTo(newPhoto.bytes());
        assertThatThrownBy(() -> readsAccount.photo(ISSUER, FOLLOWER.toString(), FOLLOWER))
            .isInstanceOf(AccountNotFoundException.class);
      } finally {
        proceed.complete(null);
      }
    }
  }

  @Test
  @DisplayName("Return starts empty while retained visible and withdrawn facts keep their state")
  void recreatesWithoutPersonalAssociations() throws Exception {
    // Given
    follow(FOLLOWER);
    follow(OTHER);
    SubmitContribution.Outcome foreign = submit(OTHER, "0", "https://youtu.be/foreign", false);
    reports.report(FOLLOWER, foreign.version().id(), "Original private reason");
    moderator(FOLLOWER);
    moderation.change(
        FOLLOWER, matchId, foreign.version().id(), "2", StreamModerationActionEnum.WITHDRAW);
    SubmitContribution.Outcome source = submit(FOLLOWER, "3", "https://youtu.be/retained", false);
    moderation.change(
        FOLLOWER, matchId, source.version().id(), "4", StreamModerationActionEnum.WITHDRAW);
    SubmitContribution.Outcome visible =
        moderation.reactivate(FOLLOWER, matchId, source.version().id(), "5");
    reports.report(OTHER, visible.version().id(), "Other retained reason");
    destinations.replace(new Registration(CONNECTION, INSTALLATION, FOLLOWER, "Expo[original]"));
    profiles.change(
        ISSUER,
        FOLLOWER.toString(),
        FOLLOWER,
        "FormerProfile",
        ProfilePhotoActionEnum.REPLACE,
        photos.prepare(png(8), "image/png"));
    List<Map<String, Object>> facts = retainedFacts();
    List<Map<String, Object>> announcements =
        sql.queryForList("SELECT * FROM match_announcement ORDER BY match_id");
    assertThat(count("notification")).isPositive();
    when(auth0.remove(any(), any())).thenReturn(AccountCleanup.Outcome.UNAVAILABLE_OR_UNCERTAIN);
    when(revenueCat.remove(any())).thenReturn(AccountCleanup.Outcome.QUEUED);
    when(principal.read(ISSUER, FOLLOWER.toString()))
        .thenReturn(
            new PrincipalReader.Evidence(
                "returned@example.invalid", NOW.minusSeconds(1000000), List.of()));

    // When
    erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
    EstablishAccount.Outcome returned = establishment.establish(ISSUER, FOLLOWER.toString());
    UUID replacement = returned.view().account().id();

    // Then
    assertThat(returned.created()).isTrue();
    assertThat(replacement).isNotEqualTo(FOLLOWER);
    assertThat(returned.view().account().username()).isNotEqualTo("FormerProfile");
    assertThat(returned.view().account().principalCreatedAt()).isEqualTo(NOW.minusSeconds(1000000));
    assertThat(returned.view().hasPhoto()).isFalse();
    assertThat(returned.view().permissions()).isEmpty();
    for (String table :
        List.of(
            "pool_follow",
            "team_follow",
            "notification",
            "push_subscription",
            "account_permission")) {
      assertThat(
              sql.queryForObject(
                  "SELECT COUNT(*) FROM " + table + " WHERE account_id IN (?,?)",
                  Long.class,
                  FOLLOWER,
                  replacement))
          .as(table)
          .isZero();
    }
    assertThat(retainedFacts()).isEqualTo(facts);
    assertThat(contributions.version(source.version().id()).orElseThrow().state())
        .isEqualTo(State.WITHDRAWN);
    assertThat(contributions.version(visible.version().id()).orElseThrow().state())
        .isEqualTo(State.ACTIVE);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_version WHERE owner_id IN (?,?) OR publication_actor_id IN (?,?) OR decision_actor_id IN (?,?)",
                Long.class,
                FOLLOWER,
                replacement,
                FOLLOWER,
                replacement,
                FOLLOWER,
                replacement))
        .isZero();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM contribution_report", Long.class))
        .isEqualTo(2);
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM contribution_report WHERE reporter_id IS NULL AND reason IS NULL",
                Long.class))
        .isEqualTo(1);
    assertThat(
            sql.queryForObject(
                "SELECT reason FROM contribution_report WHERE reporter_id=?", String.class, OTHER))
        .isEqualTo("Other retained reason");
    assertThat(sql.queryForList("SELECT * FROM match_announcement ORDER BY match_id"))
        .isEqualTo(announcements);
    assertThat(
            follows.read(
                new FollowContext(
                    OTHER, new FollowContext.Target(FollowContext.TargetType.POOL, scope.pool()))))
        .isTrue();
    ReadOwnContributions.Page personal = reads.read(replacement, matchId, 0);
    assertThat(personal.versions().items()).isEmpty();
    assertThat(personal.activeContribution()).isNull();
    assertThat(personal.proposalCount()).isZero();
    mvc.perform(
            get("/accounts/{id}/photo", FOLLOWER)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer(ISSUER)
                                    .subject(FOLLOWER.toString())
                                    .claim("azp", "mobile-test"))))
        .andExpect(status().isNotFound());
    mvc.perform(profilePatch(FOLLOWER, "{\"username\":\"OldRequest\"}"))
        .andExpect(status().isNotFound());
    // A still-valid same-subject authentication may use the replacement's current baseline rights.
    mvc.perform(profilePatch(replacement, "{\"username\":\"CurrentRequest\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(replacement.toString()));
    assertThat(readsAccount.current(ISSUER, FOLLOWER.toString()).account().username())
        .isEqualTo("CurrentRequest");
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
            })
        .thenReturn(new PrincipalReader.Evidence("replacement@example.invalid", NOW, List.of()));
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      Future<EstablishAccount.Outcome> old =
          worker.submit(() -> establishment.establish(ISSUER, FOLLOWER.toString()));
      requested.get(10, TimeUnit.SECONDS);
      erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
      ReadAccount.View replacement = establishment.establish(ISSUER, FOLLOWER.toString()).view();
      assertThat(replacement.account().id()).isNotEqualTo(FOLLOWER);

      // When
      response.complete(new PrincipalReader.Evidence("old@example.invalid", NOW, List.of()));

      // Then
      assertThatThrownBy(() -> old.get(10, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccountUnavailableException.class);
      assertThat(readsAccount.current(ISSUER, FOLLOWER.toString())).isEqualTo(replacement);
      assertThatThrownBy(() -> erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER))
          .isInstanceOf(AccountNotFoundException.class);
      org.mockito.Mockito.verify(auth0).remove(ISSUER, FOLLOWER.toString());
    } finally {
      response.complete(new PrincipalReader.Evidence(null, null, List.of()));
    }
  }

  /**
   * Captures nonpersonal content, moderation, quota and lineage facts for exact retention checks.
   *
   * @return ordered values excluding the attribution that erasure must clear
   */
  private List<Map<String, Object>> retainedFacts() {
    return sql.queryForList(
        "SELECT id, match_id, address, platform, state, created_at, quota_participating, source_version_id, replaced_by_version_id, publication_kind, publication_at, decision_kind, decision_at FROM contribution_version ORDER BY id");
  }

  /**
   * Builds an original-target generated multipart request with the same validated test principal.
   *
   * @param id exact original account to mutate
   * @param json explicit profile intent; image parts stay visible in the scenario
   * @return request builder without performing the write
   */
  private static MockMultipartHttpServletRequestBuilder profilePatch(UUID id, String json) {
    MockPart metadata = new MockPart("metadata", json.getBytes(StandardCharsets.UTF_8));
    metadata.getHeaders().setContentType(MediaType.APPLICATION_JSON);
    MockMultipartHttpServletRequestBuilder request =
        multipart(HttpMethod.PATCH, "/accounts/" + id).part(metadata);
    request.with(
        jwt()
            .jwt(
                token ->
                    token.issuer(ISSUER).subject(FOLLOWER.toString()).claim("azp", "mobile-test")));
    return request;
  }

  /**
   * Encodes actual square pixels for the real US2 preparation boundary.
   *
   * @param dimension scenario-owned square size in pixels
   * @return decodable PNG bytes
   * @throws Exception if the in-memory native encoder fails
   */
  private static byte[] png(int dimension) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(
        new BufferedImage(dimension, dimension, BufferedImage.TYPE_INT_RGB), "png", output);
    return output.toByteArray();
  }
}
