package com.blockout.backend.access.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountCleanup;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ChangeSportingClassification;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.net.URI;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * T011 exercises real F01/F02/F05/F08/F12 commands and migrated PostgreSQL. Only time, provider
 * evidence/cleanup and validated HTTP principals are controlled; no authorization is replaced.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@DisplayName("Direct current-grant authorization across owners")
class DirectAuthorizationIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private MockMvc mvc;
  @Autowired private CurrentPermissions permissions;
  @Autowired private ChangeCollectionControls collection;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private ChangeSportingClassification classification;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private UpdateAccessSettings settings;
  @Autowired private MaintenanceAdmission admission;
  @Autowired private EraseAccount erasure;
  @Autowired private EstablishAccount establishment;
  @MockitoBean private PrincipalReader principal;
  @MockitoBean private AccountCleanup.Auth0 auth0;
  @MockitoBean private AccountCleanup.RevenueCat revenueCat;

  /** Restores only this suite's disposable settings so every command uses a fresh revision. */
  @BeforeEach
  void resetSettings() {
    sql.update(
        "UPDATE access_settings SET revision=0, active=false, message='Synthetic initial', image_url=NULL WHERE id='maintenance'");
    sql.update(
        "UPDATE access_settings SET revision=0, message=NULL, ios_minimum_version=NULL, ios_store_url=NULL, android_minimum_version=NULL, android_store_url=NULL WHERE id='versions'");
  }

  @ParameterizedTest
  @EnumSource(Permission.class)
  @NullSource
  @DisplayName("A single grant authorizes only its real command and current account capability")
  void separatesEveryAction(Permission assigned) throws Exception {
    // Given
    if (assigned != null) grant(OTHER, assigned);

    for (Permission action : Permission.values()) {
      Map<String, Object> before = protectedState();

      // When
      ThrowingCallable command = () -> command(action, OTHER);

      // Then
      if (action == assigned) assertThatCode(command).doesNotThrowAnyException();
      else {
        assertThatThrownBy(command).isInstanceOf(AccessDeniedException.class);
        assertThat(protectedState()).isEqualTo(before);
      }
    }
    currentAccount(OTHER)
        .andExpect(
            jsonPath("$.permissions.manageMaintenance")
                .value(assigned == Permission.MANAGE_MAINTENANCE))
        .andExpect(
            jsonPath("$.permissions.manageApplicationVersions")
                .value(assigned == Permission.MANAGE_APPLICATION_VERSIONS))
        .andExpect(
            jsonPath("$.permissions.bypassMaintenance")
                .value(assigned == Permission.BYPASS_MAINTENANCE))
        .andExpect(
            jsonPath("$.permissions.manageSportingPresentation")
                .value(assigned == Permission.MANAGE_SPORTING_PRESENTATION))
        .andExpect(
            jsonPath("$.permissions.manageSportingClassification")
                .value(assigned == Permission.MANAGE_SPORTING_CLASSIFICATION))
        .andExpect(
            jsonPath("$.permissions.manageDivisionLifecycle")
                .value(assigned == Permission.MANAGE_DIVISION_LIFECYCLE))
        .andExpect(
            jsonPath("$.permissions.manageCollection")
                .value(assigned == Permission.MANAGE_COLLECTION))
        .andExpect(
            jsonPath("$.permissions.moderateStreamLinks")
                .value(assigned == Permission.MODERATE_STREAM_LINKS));
    assertThat(
            sql.queryForObject(
                "SELECT enabled FROM collection_control WHERE id=?",
                Boolean.class,
                SportingIngestionFixture.CONTROL))
        .isEqualTo(assigned != Permission.MANAGE_COLLECTION);
    assertThat(
            sql.queryForObject(
                "SELECT manual_name FROM sporting_pool WHERE id=?", String.class, scope.pool()))
        .isEqualTo(assigned == Permission.MANAGE_SPORTING_PRESENTATION ? "Qualified pool" : null);
    assertThat(count("contribution_version"))
        .isEqualTo(assigned == Permission.MODERATE_STREAM_LINKS ? 1 : 0);
    assertThat(permissions.forAccount(OTHER))
        .containsExactlyInAnyOrderElementsOf(assigned == null ? List.of() : List.of(assigned));
  }

  @ParameterizedTest
  @EnumSource(Permission.class)
  @DisplayName(
      "A previously returned grant cannot authorize a direct command after manual withdrawal")
  void refusesRevokedProjection(Permission action) throws Exception {
    // Given
    grant(OTHER, action);
    currentAccount(OTHER);
    assertThat(permissions.forAccount(OTHER)).containsExactly(action);
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.queryForObject("SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, OTHER);
              sql.update(
                  "DELETE FROM account_permission WHERE account_id=? AND permission=?",
                  OTHER,
                  action.getValue());
            });
    Map<String, Object> before = protectedState();

    // When
    ThrowingCallable direct = () -> command(action, OTHER);

    // Then
    assertThatThrownBy(direct).isInstanceOf(AccessDeniedException.class);
    assertThat(protectedState()).isEqualTo(before);
    assertThat(permissions.forAccount(OTHER)).isEmpty();
    currentAccount(OTHER)
        .andExpect(
            jsonPath("$.permissions.*")
                .value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(false))));
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "Guest and ordinary HTTP calls to real protected commands leave persisted state intact")
  void refusesDirectHttp(boolean authenticated) throws Exception {
    // Given
    Map<String, Object> before = protectedState();
    RequestPostProcessor caller = authenticated ? operator(OTHER) : request -> request;

    // When
    ResultActions collect =
        mvc.perform(
            put(
                    "/administration/collection-controls/{id}/activity",
                    SportingIngestionFixture.CONTROL)
                .with(caller)
                .contentType("application/json")
                .content("{\"revision\":1,\"enabled\":false}"));
    ResultActions divide =
        mvc.perform(
            put("/administration/divisions/{id}/activity", SportingIngestionFixture.DIVISION)
                .with(caller)
                .contentType("application/json")
                .content("{\"revision\":\"0\",\"active\":false}"));
    ResultActions publish =
        mvc.perform(
            post("/administration/matches/{id}/stream-contributions", matchId)
                .with(caller)
                .contentType("application/json")
                .content(
                    "{\"actorAccountId\":\""
                        + OTHER
                        + "\",\"revision\":\"0\",\"url\":\"https://youtu.be/direct\"}"));

    // Then
    int expected = authenticated ? 403 : 401;
    collect.andExpect(status().is(expected));
    divide.andExpect(status().is(expected));
    publish.andExpect(status().is(expected));
    assertThat(protectedState()).isEqualTo(before);
  }

  @Test
  @DisplayName(
      "Actual erasure and explicit recreation preserve settings but restore no grant to either UUID")
  void erasesOriginalLifecycle() throws Exception {
    // Given
    for (Permission action : Permission.values()) grant(OTHER, action);
    List<Map<String, Object>> originalSettings =
        sql.queryForList("SELECT * FROM access_settings ORDER BY id");
    RequestPostProcessor oldSession = operator(OTHER);
    currentAccount(OTHER).andExpect(jsonPath("$.permissions.manageCollection").value(true));
    when(principal.read(ISSUER, OTHER.toString()))
        .thenReturn(
            new PrincipalReader.Evidence(
                "synthetic@example.invalid", NOW.minusSeconds(604800), List.of()));

    // When
    erasure.erase(ISSUER, OTHER.toString(), OTHER);

    // Then
    mvc.perform(get("/accounts/me").with(oldSession)).andExpect(status().isNotFound());
    for (Permission action : Permission.values()) {
      assertThatThrownBy(() -> command(action, OTHER))
          .isInstanceOfAny(AccessDeniedException.class, AccountNotFoundException.class);
    }
    // When
    EstablishAccount.Outcome replacement = establishment.establish(ISSUER, OTHER.toString());
    UUID replacementId = replacement.view().account().id();

    // Then
    assertThat(replacement.created()).isTrue();
    assertThat(replacementId).isNotEqualTo(OTHER);
    mvc.perform(get("/accounts/me").with(oldSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accountId").value(replacementId.toString()))
        .andExpect(
            jsonPath("$.permissions.*")
                .value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is(false))));
    Map<String, Object> before = protectedState();
    for (Permission action : Permission.values()) {
      assertThatThrownBy(() -> command(action, OTHER))
          .isInstanceOfAny(AccessDeniedException.class, AccountNotFoundException.class);
      assertThatThrownBy(() -> command(action, replacementId))
          .isInstanceOf(AccessDeniedException.class);
    }
    assertThat(protectedState()).isEqualTo(before);
    assertThat(sql.queryForList("SELECT * FROM access_settings ORDER BY id"))
        .isEqualTo(originalSettings);

    // When
    SubmitContribution.Outcome ordinary =
        submissions.submit(
            replacementId, matchId, "0", URI.create("https://youtu.be/recreated-ordinary"), false);

    // Then
    assertThat(ordinary.version().ownerId()).isEqualTo(replacementId);
    verifyNoInteractions(auth0, revenueCat);
  }

  @ParameterizedTest
  @CsvSource({"-1,false", "604799,false", "604800,true"})
  @DisplayName("Newly established ordinary accounts retain the exact F08 seven-day condition")
  void retainsOrdinaryAge(long ageSeconds, boolean eligible) {
    // Given
    when(principal.read(ISSUER, "auth0|new-287"))
        .thenReturn(
            new PrincipalReader.Evidence(
                "new@example.invalid",
                ageSeconds < 0 ? null : NOW.minusSeconds(ageSeconds),
                List.of()));
    UUID account = establishment.establish(ISSUER, "auth0|new-287").view().account().id();

    // When
    ThrowingCallable publish =
        () ->
            submissions.submit(
                account, matchId, "0", URI.create("https://youtu.be/ordinary"), false);

    // Then
    if (eligible) assertThatCode(publish).doesNotThrowAnyException();
    else
      assertThatThrownBy(publish)
          .isInstanceOfSatisfying(
              ContributionRejectedException.class,
              failure ->
                  assertThat(failure.getStatus())
                      .isEqualTo(
                          ageSeconds < 0 ? Status.ACCOUNT_AGE_UNKNOWN : Status.ACCOUNT_TOO_YOUNG));
    assertThat(permissions.forAccount(account)).isEmpty();
    assertThat(count("contribution_version")).isEqualTo(eligible ? 1 : 0);
  }

  @ParameterizedTest
  @EnumSource(
      value = Permission.class,
      names = {"MANAGE_MAINTENANCE", "MANAGE_COLLECTION", "MODERATE_STREAM_LINKS"})
  @DisplayName("Only the F08 moderation grant provides its domain-owned age exception")
  void restrictsAgeException(Permission assigned) {
    // Given
    grant(OTHER, assigned);
    sql.update("UPDATE account SET principal_created_at=? WHERE id=?", Timestamp.from(NOW), OTHER);

    // When
    ThrowingCallable publish = () -> submit(OTHER, "0", "https://youtu.be/young", false);

    // Then
    if (assigned == Permission.MODERATE_STREAM_LINKS)
      assertThatCode(publish).doesNotThrowAnyException();
    else
      assertThatThrownBy(publish)
          .isInstanceOfSatisfying(
              ContributionRejectedException.class,
              failure -> assertThat(failure.getStatus()).isEqualTo(Status.ACCOUNT_TOO_YOUNG));
    assertThat(count("contribution_version"))
        .isEqualTo(assigned == Permission.MODERATE_STREAM_LINKS ? 1 : 0);
  }

  @ParameterizedTest
  @EnumSource(
      value = Permission.class,
      names = {"MANAGE_COLLECTION", "MANAGE_SPORTING_PRESENTATION", "MODERATE_STREAM_LINKS"})
  @DisplayName("A real domain command ordered after manual withdrawal is refused without effects")
  void withdrawalPrecedesCommand(Permission action) throws Exception {
    // Given
    grant(OTHER, action);
    Map<String, Object> before = protectedState();
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> waiting =
          tx.execute(
              status -> {
                sql.queryForObject(
                    "SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, OTHER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  command(action, OTHER);
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                sql.update(
                    "DELETE FROM account_permission WHERE account_id=? AND permission=?",
                    OTHER,
                    action.getValue());
                return future;
              });

      // Then
      assertThatThrownBy(() -> waiting.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(protectedState()).isEqualTo(before);
    }
  }

  @ParameterizedTest
  @EnumSource(
      value = Permission.class,
      names = {"MANAGE_COLLECTION", "MANAGE_SPORTING_PRESENTATION", "MODERATE_STREAM_LINKS"})
  @DisplayName("A real admitted domain command commits before a waiting manual withdrawal")
  void commandPrecedesWithdrawal(Permission action) throws Exception {
    // Given
    grant(OTHER, action);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate tx = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> waiting =
          tx.execute(
              status -> {
                command(action, OTHER);
                Future<?> future =
                    worker.submit(
                        () ->
                            tx.executeWithoutResult(
                                inner -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  sql.queryForObject(
                                      "SELECT id FROM account WHERE id=? FOR UPDATE",
                                      UUID.class,
                                      OTHER);
                                  sql.update(
                                      "DELETE FROM account_permission WHERE account_id=? AND permission=?",
                                      OTHER,
                                      action.getValue());
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return future;
              });
      waiting.get(15, TimeUnit.SECONDS);

      // Then
      switch (action) {
        case MANAGE_COLLECTION ->
            assertThat(
                    sql.queryForObject(
                        "SELECT enabled FROM collection_control WHERE id=?",
                        Boolean.class,
                        SportingIngestionFixture.CONTROL))
                .isFalse();
        case MANAGE_SPORTING_PRESENTATION ->
            assertThat(
                    sql.queryForObject(
                        "SELECT manual_name FROM sporting_pool WHERE id=?",
                        String.class,
                        scope.pool()))
                .isEqualTo("Qualified pool");
        case MODERATE_STREAM_LINKS ->
            assertThat(contributions.active(matchId).orElseThrow().ownerId()).isEqualTo(OTHER);
        default -> throw new IllegalArgumentException("Unsupported race action");
      }
      assertThat(permissions.forAccount(OTHER)).isEmpty();
    }
  }

  /**
   * Calls the actual action owner with valid synthetic intent; never substitutes policy or effects.
   *
   * @param action exact grant whose independent owner is exercised
   * @param actor captured business UUID, including deliberately erased originals
   */
  private void command(Permission action, UUID actor) {
    switch (action) {
      case MANAGE_MAINTENANCE ->
          settings.changeMaintenance(
              actor,
              new UpdateAccessSettings.MaintenanceChange(
                  0, "Synthetic maintenance", JsonNullable.undefined()));
      case MANAGE_APPLICATION_VERSIONS ->
          settings.changeVersions(
              actor,
              new UpdateAccessSettings.VersionChange(
                  0, null, null, JsonNullable.of("Synthetic update")));
      case BYPASS_MAINTENANCE -> {
        // Fixture activation is rolled back, so this read-only admission probe changes no settings.
        new TransactionTemplate(transactions)
            .executeWithoutResult(
                status -> {
                  sql.update("UPDATE access_settings SET active=true WHERE id='maintenance'");
                  try {
                    admission.requireOrdinaryAccess(ISSUER, subject(actor), true);
                  } finally {
                    status.setRollbackOnly();
                  }
                });
      }
      case MANAGE_COLLECTION ->
          collection.setActivity(
              actor,
              SportingIngestionFixture.CONTROL,
              sql.queryForObject(
                  "SELECT revision FROM collection_control WHERE id=?",
                  Long.class,
                  SportingIngestionFixture.CONTROL),
              false);
      case MANAGE_SPORTING_PRESENTATION ->
          presentation.set(
              actor, Kind.POOL, scope.pool(), new Edit("0", "Qualified pool", null, null, null));
      case MANAGE_SPORTING_CLASSIFICATION ->
          classification.setPack(
              actor,
              sql.queryForObject(
                  "SELECT pack_id FROM sporting_pool WHERE id=?", UUID.class, scope.pool()),
              "0",
              new SportingClassification(
                  SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE));
      case MANAGE_DIVISION_LIFECYCLE ->
          divisions.create(
              actor, new DivisionDefinition("Synthetic direct", "#112233", null), null);
      case MODERATE_STREAM_LINKS ->
          submissions.submit(actor, matchId, "0", URI.create("https://youtu.be/direct"), true);
    }
  }

  /**
   * Resolves a fixture principal only for admission; absent originals retain their original
   * subject.
   *
   * @param actor original or recreated business UUID
   * @return fixture subject, never an account replacement lookup by principal
   */
  private String subject(UUID actor) {
    List<String> subjects =
        sql.queryForList("SELECT subject FROM account WHERE id=?", String.class, actor);
    return subjects.isEmpty() ? actor.toString() : subjects.getFirst();
  }

  /**
   * Reads only the command effects under test, excluding fixture identities and incidental
   * metadata.
   *
   * @return settings, control intent, sporting edits and publication/announcement counts
   */
  private Map<String, Object> protectedState() {
    return sql.queryForMap(
        """
        SELECT m.active, m.message AS maintenance_message, m.revision AS maintenance_revision,
               v.message AS update_message, v.revision AS versions_revision,
               c.enabled, c.request_id, c.revision AS control_revision,
               p.manual_name, p.presentation_revision, p.revision AS pool_revision,
               k.setting_division_id, k.setting_format, k.setting_gender, k.revision AS pack_revision,
               d.active AS division_active, d.revision AS division_revision,
               (SELECT COUNT(*) FROM sporting_division) AS divisions,
               (SELECT COUNT(*) FROM contribution_version) AS versions,
               (SELECT COALESCE(SUM(revision),0) FROM contribution_state) AS contribution_revision,
               (SELECT COUNT(*) FROM match_announcement) AS announcements,
               (SELECT COUNT(*) FROM notification) AS notifications
        FROM access_settings m, access_settings v, collection_control c,
             sporting_pool p JOIN sporting_pack k ON k.id=p.pack_id,
             sporting_division d
        WHERE m.id='maintenance' AND v.id='versions' AND c.id=? AND p.id=? AND d.id=?
        """,
        SportingIngestionFixture.CONTROL,
        scope.pool(),
        SportingIngestionFixture.DIVISION);
  }

  /**
   * Inserts only a fictitious grant in the suite-owned disposable migrated database.
   *
   * @param actor existing fixture business UUID
   * @param action exact supported persisted action value
   */
  private void grant(UUID actor, Permission action) {
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?,?)",
        actor,
        action.getValue());
  }

  /**
   * Reads the generated current-account projection through actual MVC, security and persistence.
   *
   * @param actor established fixture principal
   * @return successful response for capability assertions
   */
  private ResultActions currentAccount(UUID actor) throws Exception {
    return mvc.perform(get("/accounts/me").with(operator(actor))).andExpect(status().isOk());
  }

  /**
   * Supplies only a validated test principal; current SQL, not token claims, owns permissions.
   *
   * @param actor fixture principal whose subject is its original UUID string
   * @return Spring Security's controlled JWT authentication boundary
   */
  private RequestPostProcessor operator(UUID actor) {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject(actor.toString()).claim("azp", "mobile-test"));
  }
}
