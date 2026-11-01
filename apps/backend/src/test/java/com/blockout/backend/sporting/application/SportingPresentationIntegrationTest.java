package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.mobile.model.ClubContactsResponse;
import com.blockout.backend.generated.mobile.model.ContactFieldRequest;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.generated.mobile.model.SetClubContactsRequest;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.ClubAcquisitionReference;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ClubObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingPresentation.LocalityObservation;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptClubDetails;
import com.blockout.backend.sporting.application.service.AcceptClubLocality;
import com.blockout.backend.sporting.application.service.AcceptSourceImage;
import com.blockout.backend.sporting.application.service.ChangeClubContacts;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.application.service.RestrictClubContacts;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingImageFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
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
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

/** Proves presentation transactions and current reads against explicitly migrated PostgreSQL. */
@Import({PostgresTestConfiguration.class, SportingIdentityFixture.class})
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@DisplayName("Atomic sporting presentation")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SportingPresentationIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  @Autowired private com.blockout.backend.access.application.CurrentPermissions permissions;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @Autowired private ReadSportingData reads;
  @Autowired private ReadSportingAcquisition acquisitionReads;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private AccountStore accounts;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ReadSportingConfiguration configurationReads;
  @Autowired private AcceptSourceImage images;
  @Autowired private ApplicationEvents events;
  @Autowired private ChangeClubContacts details;
  @Autowired private RestrictClubContacts contactRestrictions;
  @Autowired private AcceptClubDetails clubObservations;

  @Autowired private AcceptClubLocality localities;
  @Autowired private ChangeSportingPresentation presentation;

  private Scope scope;
  private UUID account;
  private UUID club;
  private UUID team;

  /**
   * Establishes a real F01 cycle and an explicitly granted synthetic operator.
   *
   * @throws Exception if isolated fixture reset fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    sql.update("DELETE FROM account");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    account =
        new TransactionTemplate(transactions)
            .execute(
                state ->
                    accounts
                        .create(
                            "https://identity.example.invalid/",
                            "auth0|presentation",
                            "Operator_193",
                            "operator@example.invalid",
                            null)
                        .id());
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'sporting-presentation.manage')",
        account);
    team =
        identities
            .identifyMatch(
                scope.pool(),
                "PRESENTATION",
                new TeamCandidate(null, "Home", "00193", "Club"),
                new TeamCandidate(null, "Away", "00194", "Other"))
            .homeTeamId();
    club = acquisitionReads.team(team).orElseThrow().clubId();
  }

  @Test
  @DisplayName("Publishes a manual pool name while preserving the independent source label")
  void publishesIndependentManualPoolName() throws Exception {
    // Given
    UUID pool = scope.pool();

    // When
    mvc.perform(
            put("/administration/pools/{id}/presentation", pool)
                .with(operator())
                .contentType("application/json")
                .content(
                    "{\"revision\":\"0\",\"manualName\":\"Manual pool\",\"manualShortName\":null}"))
        .andExpect(status().isOk());

    // Then
    assertThat(reads.publicInputs(Kind.POOL, Set.of(pool)))
        .singleElement()
        .satisfies(
            value -> {
              assertThat(value.effectiveName()).isEqualTo("Manual pool");
              assertThat(value.sourceName()).isEqualTo("Synthetic pool");
            });
  }

  @Test
  @DisplayName("Keeps independent team names across source refresh and restoration")
  void preservesIndependentNames() {
    // Given
    SportingPresentation.View before =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.TEAM, team);
    presentation.set(
        account,
        SportingProjectionChanges.Kind.TEAM,
        team,
        new Edit(before.revision(), "Manual full", "Manual short", LogoActionEnum.KEEP, null));

    // When
    identities.identifyMatch(
        scope.pool(),
        "PRESENTATION",
        new TeamCandidate(null, "HOME", "00193", "Club"),
        new TeamCandidate(null, "Away", "00194", "Other"));
    SportingPresentation.View refreshed =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.TEAM, team);
    SportingPresentation.View restored =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.TEAM,
            team,
            new Edit(refreshed.revision(), null, "Manual short", LogoActionEnum.KEEP, null));

    // Then
    assertThat(refreshed.names().sourceName()).isEqualTo("HOME");
    assertThat(refreshed.names().effectiveName()).isEqualTo("Manual full");
    assertThat(restored.names().effectiveName()).isEqualTo("HOME");
    assertThat(restored.names().effectiveShortName()).isEqualTo("Manual short");
    assertThat(reads.publicInputs(Kind.TEAM, Set.of(team)))
        .singleElement()
        .satisfies(
            input -> {
              assertThat(input.effectiveName()).isEqualTo("HOME");
              assertThat(input.effectiveShortName()).isEqualTo("Manual short");
            });
  }

  @Test
  @DisplayName("Preserves no-op revisions while rejecting stale matching presentation changes")
  void rejectsStaleNoOp() {
    // Given
    SportingPresentation.View current =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.CLUB, club);
    Edit unchanged = new Edit(current.revision(), null, null, LogoActionEnum.KEEP, null);
    SportingPresentation.View noOp =
        presentation.set(account, SportingProjectionChanges.Kind.CLUB, club, unchanged);
    SportingPresentation.View changed =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.CLUB,
            club,
            new Edit(current.revision(), "Manual", null, LogoActionEnum.KEEP, null));

    // When
    ThrowingCallable stale =
        () ->
            presentation.set(
                account,
                SportingProjectionChanges.Kind.CLUB,
                club,
                new Edit(current.revision(), "Manual", null, LogoActionEnum.KEEP, null));

    // Then
    assertThat(noOp.revision()).isEqualTo(current.revision());
    assertThatThrownBy(stale).isInstanceOf(SportingConflictException.class);
    assertThat(configurationReads.presentation(account, SportingProjectionChanges.Kind.CLUB, club))
        .isEqualTo(changed);
  }

  @Test
  @DisplayName(
      "Retains independent contact modes through repeated collection and explicit source restoration")
  void preservesContactModes() {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            "Source club",
            Map.of(
                ContactField.PHONE,
                JsonNullable.of("0100000001"),
                ContactField.EMAIL,
                JsonNullable.of("source@example.invalid"),
                ContactField.WEBSITE,
                JsonNullable.of("https://example.invalid/"))));
    Contacts corrected =
        details.correct(
            account,
            club,
            Long.toString(configurationReads.clubContacts(account, club).revision()),
            Map.of(
                ContactField.PHONE, new ContactEdit(ContactModeEnum.MANUAL, "0100000099"),
                ContactField.EMAIL, new ContactEdit(ContactModeEnum.HIDDEN, null)));

    // When
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 2),
            "New source name",
            Map.of(
                ContactField.PHONE,
                JsonNullable.of("0100000002"),
                ContactField.EMAIL,
                JsonNullable.of("new@example.invalid"),
                ContactField.WEBSITE,
                JsonNullable.of("https://example.invalid/new"))));
    Contacts refreshed = configurationReads.clubContacts(account, club);
    Contacts restored =
        details.correct(
            account,
            club,
            Long.toString(refreshed.revision()),
            Map.of(ContactField.PHONE, new ContactEdit(ContactModeEnum.SOURCE, null)));

    // Then
    assertThat(corrected.fields().get(ContactField.PHONE).effectiveValue()).isEqualTo("0100000099");
    assertThat(refreshed.fields().get(ContactField.PHONE).effectiveValue()).isEqualTo("0100000099");
    assertThat(refreshed.fields().get(ContactField.EMAIL).effectiveValue()).isNull();
    assertThat(refreshed.fields().get(ContactField.WEBSITE).effectiveValue())
        .isEqualTo("https://example.invalid/new");
    assertThat(restored.fields().get(ContactField.PHONE).effectiveValue()).isEqualTo("0100000002");
    assertThat(restored.fields().get(ContactField.EMAIL).mode()).isEqualTo(ContactModeEnum.HIDDEN);
    assertThat(reads.publicClubContacts(club).get(ContactField.EMAIL)).isNull();
  }

  @Test
  @DisplayName(
      "Preserves valid automatic contacts on invalid proposals and withdraws only explicit nulls")
  void preservesValidSourceValues() {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            null,
            Map.of(
                ContactField.EMAIL,
                JsonNullable.of("source@example.invalid"),
                ContactField.PHONE,
                JsonNullable.of("0100000001"))));
    long revision = configurationReads.clubContacts(account, club).revision();

    // When
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 2),
            null,
            Map.of(
                ContactField.EMAIL,
                JsonNullable.of("invalid email"),
                ContactField.PHONE,
                JsonNullable.undefined())));
    Contacts retained = configurationReads.clubContacts(account, club);
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 3), null, Map.of(ContactField.EMAIL, JsonNullable.of(null))));
    ObservationOutcome stale =
        clubObservations.accept(
            club,
            new ClubObservation(
                context(sheets, 2),
                "Old name",
                Map.of(ContactField.WEBSITE, JsonNullable.of("https://old.example.invalid/"))));

    // Then
    assertThat(retained.revision()).isEqualTo(revision);
    assertThat(retained.fields().get(ContactField.EMAIL).effectiveValue())
        .isEqualTo("source@example.invalid");
    assertThat(
            configurationReads
                .clubContacts(account, club)
                .fields()
                .get(ContactField.EMAIL)
                .effectiveValue())
        .isNull();
    assertThat(
            configurationReads
                .clubContacts(account, club)
                .fields()
                .get(ContactField.PHONE)
                .effectiveValue())
        .isEqualTo("0100000001");
    assertThat(stale.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(
            configurationReads
                .clubContacts(account, club)
                .fields()
                .get(ContactField.WEBSITE)
                .effectiveValue())
        .isNull();
  }

  @Test
  @DisplayName("Refuses a whole contact correction if one field is invalid or restricted")
  void refusesWholeContactCorrection() {
    // Given
    contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
    Contacts current = configurationReads.clubContacts(account, club);

    // When
    ThrowingCallable change =
        () ->
            details.correct(
                account,
                club,
                Long.toString(current.revision()),
                Map.of(
                    ContactField.PHONE, new ContactEdit(ContactModeEnum.MANUAL, "0100000001"),
                    ContactField.EMAIL,
                        new ContactEdit(ContactModeEnum.MANUAL, "manual@example.invalid")));

    // Then
    assertThatThrownBy(change).isInstanceOf(SportingConflictException.class);
    assertThat(configurationReads.clubContacts(account, club)).isEqualTo(current);
    assertThatThrownBy(
            () ->
                details.correct(
                    account,
                    club,
                    Long.toString(current.revision()),
                    Map.of(
                        ContactField.PHONE, new ContactEdit(ContactModeEnum.MANUAL, "0100000001"),
                        ContactField.WEBSITE,
                            new ContactEdit(
                                ContactModeEnum.MANUAL, "https://user:secret@example.invalid/"))))
        .isInstanceOf(SportingValidationException.class);
    assertThat(configurationReads.clubContacts(account, club)).isEqualTo(current);
  }

  @ParameterizedTest
  @CsvSource({
    "ADDRESS, 1 rue du Test, 2 rue du Test",
    "CITY, Paris, Lyon",
    "POSTAL_CODE, 75001, 69001",
    "EMAIL, source@example.invalid, manual@example.invalid",
    "PHONE, 0100000001, 0100000002",
    "WEBSITE, https://source.example.invalid/, https://manual.example.invalid/"
  })
  @DisplayName(
      "Clears restricted source/manual values and prevents collection or ordinary restoration from republishing them")
  void preservesRestrictions(ContactField field, String sourceValue, String manualValue) {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    ContactField unrelated =
        field == ContactField.WEBSITE ? ContactField.PHONE : ContactField.WEBSITE;
    String unrelatedValue =
        unrelated == ContactField.PHONE ? "0100000009" : "https://club.example.invalid/";
    // Column names come only from the closed owner enum, never from a request or provider.
    String column =
        field == ContactField.CITY ? "municipality" : field.name().toLowerCase(Locale.ROOT);
    String inspect =
        "SELECT "
            + column
            + ","
            + column
            + "_manual,"
            + column
            + "_restricted FROM sporting_club WHERE id=?";
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            null,
            Map.of(
                field, JsonNullable.of(sourceValue), unrelated, JsonNullable.of(unrelatedValue))));
    details.correct(
        account, club, "1", Map.of(field, new ContactEdit(ContactModeEnum.MANUAL, manualValue)));
    long editingRevision = configurationReads.clubContacts(account, club).revision();
    UUID match =
        sql.queryForObject("SELECT id FROM sporting_match WHERE home_team_id=?", UUID.class, team);
    contactRestrictions.restrict(club, Set.of(field));
    Contacts restricted = configurationReads.clubContacts(account, club);
    Map<String, Object> cleared = sql.queryForMap(inspect, club);

    // When
    clubObservations.accept(
        club,
        new ClubObservation(context(sheets, 2), null, Map.of(field, JsonNullable.of(sourceValue))));
    details.correct(
        account,
        club,
        Long.toString(restricted.revision()),
        Map.of(field, new ContactEdit(ContactModeEnum.SOURCE, null)));
    UUID reconstructedTeam =
        identities
            .identifyMatch(
                scope.pool(),
                "PRESENTATION",
                new TeamCandidate(null, "Home", "00193", "Club"),
                new TeamCandidate(null, "Away", "00194", "Other"))
            .homeTeamId();
    // Synthetic restoration of forbidden old columns cannot bypass the durable current flag.
    sql.update(
        "UPDATE sporting_club SET " + column + "=?, " + column + "_manual=? WHERE id=?",
        sourceValue,
        manualValue,
        club);
    Contacts restored = configurationReads.clubContacts(account, club);
    contactRestrictions.restrict(club, Set.of(field));

    // Then
    assertThat(restricted.revision()).isEqualTo(editingRevision + 1);
    assertThat(restored.fields().get(field))
        .isEqualTo(new ContactValue(null, null, ContactModeEnum.SOURCE, true));
    assertThat(reads.publicClubContacts(club).get(field)).isNull();
    assertThat(cleared)
        .containsEntry(column, null)
        .containsEntry(column + "_manual", null)
        .containsEntry(column + "_restricted", true);
    assertThat(sql.queryForMap(inspect, club))
        .containsEntry(column, null)
        .containsEntry(column + "_manual", null)
        .containsEntry(column + "_restricted", true);
    assertThat(reads.publicClubContacts(club).get(unrelated)).isEqualTo(unrelatedValue);
    assertThat(reconstructedTeam).isEqualTo(team);
    assertThat(acquisitionReads.team(team).orElseThrow().clubId()).isEqualTo(club);
    assertThat(acquisitionReads.match(match).orElseThrow().homeTeamId()).isEqualTo(team);
  }

  @ParameterizedTest
  @EnumSource(ContactModeEnum.class)
  @DisplayName("Rejects a contact editor opened before a restriction through the generated route")
  void rejectsEditorsPredatingRestriction(ContactModeEnum mode) throws Exception {
    // Given
    String revision = Long.toString(configurationReads.clubContacts(account, club).revision());
    contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
    SetClubContactsRequest request =
        new SetClubContactsRequest(revision)
            .email(
                new ContactFieldRequest(mode)
                    .value(mode == ContactModeEnum.MANUAL ? "private@example.invalid" : null));

    // When
    mvc.perform(
            patch("/administration/clubs/{id}/contacts", club)
                .with(operator())
                .contentType("application/json")
                .content(json.writeValueAsString(request)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));

    // Then
    String body =
        mvc.perform(get("/administration/clubs/{id}/contacts", club).with(operator()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    ClubContactsResponse response = json.readValue(body, ClubContactsResponse.class);
    assertThat(response.getRevision()).isEqualTo("1");
    assertThat(response.getEmail().getSourceValue()).isEqualTo(JsonNullable.of(null));
    assertThat(response.getEmail().getManualValue()).isEqualTo(JsonNullable.of(null));
    assertThat(response.getEmail().getEffectiveValue()).isEqualTo(JsonNullable.of(null));
  }

  @Test
  @DisplayName("Division reactivation cannot authorize a restricted contact from the source")
  void preservesRestrictionAcrossReactivation() {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'division-lifecycle.manage')",
        account);
    DivisionDetail inactive =
        divisions.setActive(account, SportingIngestionFixture.DIVISION, "0", false);

    // When
    divisions.setActive(
        account, SportingIngestionFixture.DIVISION, Long.toString(inactive.revision()), true);
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            null,
            Map.of(ContactField.EMAIL, JsonNullable.of("source@example.invalid"))));

    // Then
    assertThat(configurationReads.clubContacts(account, club).fields().get(ContactField.EMAIL))
        .isEqualTo(new ContactValue(null, null, ContactModeEnum.SOURCE, true));
    assertThat(
            sql.queryForMap(
                "SELECT email,email_manual,email_restricted FROM sporting_club WHERE id=?", club))
        .containsEntry("email", null)
        .containsEntry("email_manual", null)
        .containsEntry("email_restricted", true);
    assertThat(reads.publicClubContacts(club).get(ContactField.EMAIL)).isNull();
    assertThat(acquisitionReads.team(team).orElseThrow().clubId()).isEqualTo(club);
  }

  @Test
  @DisplayName("A current restricted manual write returns 409 without changing another contact")
  void rejectsRestrictedContactRouteAtomically() throws Exception {
    // Given
    contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
    Contacts current = configurationReads.clubContacts(account, club);

    // When
    mvc.perform(
            patch("/administration/clubs/{id}/contacts", club)
                .with(operator())
                .contentType("application/json")
                .content(
                    """
                    {"revision":"1","email":{"mode":"manual","value":"private@example.invalid"},
                     "phone":{"mode":"manual","value":"0100000001"}}
                    """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:conflict"));

    // Then
    assertThat(configurationReads.clubContacts(account, club)).isEqualTo(current);
    mvc.perform(get("/clubs/{id}", club))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contacts.email").doesNotExist())
        .andExpect(jsonPath("$.contacts.phone").doesNotExist());
  }

  @Test
  @DisplayName("A restriction waits for collection before clearing only the requested field")
  void restrictsLatestCollectedValues() throws Exception {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> pending =
          transaction.execute(
              status -> {
                clubObservations.accept(
                    club,
                    new ClubObservation(
                        context(sheets, 1),
                        null,
                        Map.of(
                            ContactField.EMAIL, JsonNullable.of("source@example.invalid"),
                            ContactField.PHONE, JsonNullable.of("0100000009"))));
                Future<?> restriction =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                other -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return restriction;
              });
      pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(
              sql.queryForMap(
                  "SELECT email,email_manual,email_restricted,phone FROM sporting_club WHERE id=?",
                  club))
          .containsEntry("email", null)
          .containsEntry("email_manual", null)
          .containsEntry("email_restricted", true)
          .containsEntry("phone", "0100000009");
      assertThat(reads.publicClubContacts(club).get(ContactField.EMAIL)).isNull();
      assertThat(reads.publicClubContacts(club).get(ContactField.PHONE)).isEqualTo("0100000009");
    }
  }

  @Test
  @DisplayName(
      "A contact edit waiting on a restriction rejects its obsolete revision without partial writes")
  void rejectsEditWaitingOnRestriction() throws Exception {
    // Given
    String revision = Long.toString(configurationReads.clubContacts(account, club).revision());
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<Contacts> pending =
          transaction.execute(
              status -> {
                contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
                Future<Contacts> correction =
                    worker.submit(
                        () ->
                            transaction.execute(
                                other -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  return details.correct(
                                      account,
                                      club,
                                      revision,
                                      Map.of(
                                          ContactField.EMAIL,
                                              new ContactEdit(
                                                  ContactModeEnum.MANUAL,
                                                  "private@example.invalid"),
                                          ContactField.PHONE,
                                              new ContactEdit(
                                                  ContactModeEnum.MANUAL, "0100000001")));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return correction;
              });

      // Then
      assertThatThrownBy(() -> pending.get(15, TimeUnit.SECONDS))
          .isInstanceOf(ExecutionException.class)
          .hasCauseInstanceOf(SportingConflictException.class);
      assertThat(configurationReads.clubContacts(account, club).fields().get(ContactField.EMAIL))
          .isEqualTo(new ContactValue(null, null, ContactModeEnum.SOURCE, true));
      assertThat(reads.publicClubContacts(club).get(ContactField.PHONE)).isNull();
    }
  }

  @Test
  @DisplayName("Invalidates the point only when the effective municipal context changes")
  void reconcilesEffectiveLocality() {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            null,
            Map.of(
                ContactField.CITY,
                JsonNullable.of("Paris"),
                ContactField.POSTAL_CODE,
                JsonNullable.of("75001"))));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    String originalRevision = reads.publicLocality(club).orElseThrow().revision();
    localities.accept(
        club,
        new LocalityObservation(
            context(geocoding, 1), originalRevision, GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));
    details.correct(
        account,
        club,
        Long.toString(configurationReads.clubContacts(account, club).revision()),
        Map.of(
            ContactField.CITY,
            new ContactEdit(ContactModeEnum.MANUAL, "Paris"),
            ContactField.ADDRESS,
            new ContactEdit(ContactModeEnum.MANUAL, "Synthetic street")));

    // When
    clubObservations.accept(
        club,
        new ClubObservation(
            context(sheets, 2), null, Map.of(ContactField.CITY, JsonNullable.of("Lyon"))));
    SportingPresentation.Locality masked = reads.publicLocality(club).orElseThrow();
    details.correct(
        account,
        club,
        Long.toString(configurationReads.clubContacts(account, club).revision()),
        Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.SOURCE, null)));
    SportingPresentation.Locality changed = reads.publicLocality(club).orElseThrow();
    ObservationOutcome late =
        localities.accept(
            club,
            new LocalityObservation(
                context(geocoding, 2),
                originalRevision,
                GeocodingOutcomeEnum.LOCATED,
                48.86,
                2.34));

    // Then
    assertThat(masked.revision()).isEqualTo(originalRevision);
    assertThat(masked.latitude()).isEqualTo(48.86);
    assertThat(changed.revision()).isNotEqualTo(originalRevision);
    assertThat(changed.latitude()).isNull();
    assertThat(late.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(reads.publicLocality(club).orElseThrow().latitude()).isNull();
    assertThat(acquisitionReads.acquisitionClubs(true, null))
        .filteredOn(reference -> reference.clubId().equals(club))
        .singleElement()
        .satisfies(reference -> assertThat(reference.normalLocalityResult()).isFalse());
  }

  @Test
  @DisplayName("A current municipal point creates no further geocoding candidate")
  void excludesLocatedClubFromGeocoding() {
    // Given
    details.correct(
        account,
        club,
        "0",
        Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    String revision = reads.publicLocality(club).orElseThrow().revision();

    // When
    localities.accept(
        club,
        new LocalityObservation(
            context(geocoding, 1), revision, GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));

    // Then
    assertThat(acquisitionReads.acquisitionClubs(true, null))
        .extracting(ClubAcquisitionReference::clubId)
        .doesNotContain(club);
  }

  @ParameterizedTest
  @EnumSource(
      value = GeocodingOutcomeEnum.class,
      names = {"EMPTY", "AMBIGUOUS"})
  @DisplayName("Reports accepted unresolved locality metadata for F01 scheduling")
  void reportsCurrentUnresolvedResult(GeocodingOutcomeEnum outcome) {
    // Given
    details.correct(
        account,
        club,
        "0",
        Map.of(
            ContactField.CITY,
            new ContactEdit(ContactModeEnum.MANUAL, "Paris"),
            ContactField.POSTAL_CODE,
            new ContactEdit(ContactModeEnum.MANUAL, "75001")));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    String revision = reads.publicLocality(club).orElseThrow().revision();

    // When
    localities.accept(
        club, new LocalityObservation(context(geocoding, 1), revision, outcome, null, null));

    // Then
    assertThat(reads.publicLocality(club).orElseThrow().latitude()).isNull();
    assertThat(acquisitionReads.acquisitionClubs(true, null))
        .filteredOn(reference -> reference.clubId().equals(club))
        .singleElement()
        .satisfies(
            reference -> {
              assertThat(reference.normalLocalityResult()).isTrue();
              assertThat(reference.localityOrder())
                  .isEqualTo(new ObservationOrder(geocoding.cycleOrder(), 1));
            });
  }

  @Test
  @DisplayName(
      "Rejects incomplete or out-of-range coordinates without erasing a current valid point")
  void preservesPointOnInvalidSubmission() {
    // Given
    details.correct(
        account,
        club,
        "0",
        Map.of(
            ContactField.CITY,
            new ContactEdit(ContactModeEnum.MANUAL, "Paris"),
            ContactField.POSTAL_CODE,
            new ContactEdit(ContactModeEnum.MANUAL, "75001")));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    String revision = reads.publicLocality(club).orElseThrow().revision();
    localities.accept(
        club,
        new LocalityObservation(
            context(geocoding, 1), revision, GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));

    // When
    ThrowingCallable change =
        () ->
            localities.accept(
                club,
                new LocalityObservation(
                    context(geocoding, 2), revision, GeocodingOutcomeEnum.LOCATED, null, 2.34));

    // Then
    assertThatThrownBy(change).isInstanceOf(SportingValidationException.class);
    assertThatThrownBy(
            () ->
                localities.accept(
                    club,
                    new LocalityObservation(
                        context(geocoding, 3), revision, GeocodingOutcomeEnum.LOCATED, 91.0, 2.34)))
        .isInstanceOf(SportingValidationException.class);
    assertThat(reads.publicLocality(club).orElseThrow().latitude()).isEqualTo(48.86);
    contactRestrictions.restrict(club, Set.of(ContactField.CITY));
    assertThat(reads.publicLocality(club).orElseThrow().latitude()).isNull();
    assertThat(reads.publicLocality(club).orElseThrow().revision()).isNotEqualTo(revision);
  }

  @Test
  @DisplayName("Rolls back image bytes, names and metadata together while preserving repeat no-ops")
  void commitsImageAndMetadataTogether() throws Exception {
    // Given
    Image first = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    Image second =
        new ValidateSportingImage().validate(SportingImageFixture.image("JPEG", 0x445566));
    SportingPresentation.View saved =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.CLUB,
            club,
            new Edit("0", "First", null, LogoActionEnum.REPLACE, first));

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              presentation.set(
                  account,
                  SportingProjectionChanges.Kind.CLUB,
                  club,
                  new Edit(saved.revision(), "Second", null, LogoActionEnum.REPLACE, second));
              status.setRollbackOnly();
            });
    SportingPresentation.View noOp =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.CLUB,
            club,
            new Edit(saved.revision(), "First", null, LogoActionEnum.REPLACE, first));

    // Then
    assertThat(noOp).isEqualTo(saved);
    assertThat(reads.publicLogo(SportingProjectionChanges.Kind.CLUB, club).orElseThrow().bytes())
        .isEqualTo(first.bytes());
    assertThat(
            sql.queryForMap(
                "SELECT logo_media_type,octet_length(logo) AS logo_size FROM sporting_club WHERE id=?",
                club))
        .containsEntry("logo_media_type", "image/png")
        .containsEntry("logo_size", first.bytes().length);
  }

  @Test
  @DisplayName("A grant revoked while a prepared save waits cannot authorize a write")
  void serializesGrantRevocation() throws Exception {
    // Given
    permissions.requireForRead(account, Permission.MANAGE_SPORTING_PRESENTATION);
    SportingPresentation.View before =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.CLUB, club);
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> pending =
          transaction.execute(
              status -> {
                accounts.lockById(account).orElseThrow();
                sql.update("DELETE FROM account_permission WHERE account_id=?", account);
                Future<?> save =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                other -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  presentation.set(
                                      account,
                                      SportingProjectionChanges.Kind.CLUB,
                                      club,
                                      new Edit(
                                          before.revision(),
                                          "Denied",
                                          null,
                                          LogoActionEnum.KEEP,
                                          null));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return save;
              });

      // Then
      assertThatThrownBy(() -> pending.get(15, TimeUnit.SECONDS))
          .hasCauseInstanceOf(AccessDeniedException.class);
      assertThat(reads.publicPresentation(Kind.CLUB, club).orElseThrow()).isEqualTo(before);
    }
  }

  @Test
  @DisplayName(
      "Source collection waiting on a rights restriction cannot reintroduce the private field")
  void serializesRestrictionAndCollection() throws Exception {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> pending =
          transaction.execute(
              status -> {
                contactRestrictions.restrict(club, Set.of(ContactField.EMAIL));
                Future<?> collection =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                other -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  clubObservations.accept(
                                      club,
                                      new ClubObservation(
                                          context(sheets, 1),
                                          null,
                                          Map.of(
                                              ContactField.EMAIL,
                                              JsonNullable.of("late@example.invalid"))));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return collection;
              });
      pending.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(configurationReads.clubContacts(account, club).fields().get(ContactField.EMAIL))
          .isEqualTo(new ContactValue(null, null, ContactModeEnum.SOURCE, true));
      assertThat(
              sql.queryForObject("SELECT email FROM sporting_club WHERE id=?", String.class, club))
          .isNull();
    }
  }

  @Test
  @DisplayName("Resolves current club artwork across seasons without copying it into teams")
  void inheritsCurrentClubArtwork() throws Exception {
    // Given
    Image first = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    Image second =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x445566));
    SportingPresentation.View saved =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.CLUB,
            club,
            new Edit("0", null, null, LogoActionEnum.REPLACE, first));
    UUID nextSeason = seasons.getOrCreate(2027).id();
    UUID nextPool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    nextSeason,
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "NEXT"),
                "PACK",
                "Next season",
                acquisitionReads.pool(scope.pool()).orElseThrow().classification())
            .id();
    UUID nextTeam =
        identities
            .identifyMatch(
                nextPool,
                "NEXT",
                new TeamCandidate(null, "Home", "00193", "Club"),
                new TeamCandidate(null, "Away", "00194", "Other"))
            .homeTeamId();
    SportingPresentation.View teamBefore =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.TEAM, team);

    // When
    presentation.set(
        account,
        SportingProjectionChanges.Kind.CLUB,
        club,
        new Edit(saved.revision(), null, null, LogoActionEnum.REPLACE, second));

    // Then
    assertThat(reads.publicLogo(SportingProjectionChanges.Kind.TEAM, team).orElseThrow().bytes())
        .isEqualTo(second.bytes());
    assertThat(
            reads.publicLogo(SportingProjectionChanges.Kind.TEAM, nextTeam).orElseThrow().bytes())
        .isEqualTo(second.bytes());
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_team WHERE club_id=? AND logo IS NOT NULL",
                Integer.class,
                club))
        .isZero();
    SportingPresentation.View kept =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.TEAM,
            team,
            new Edit(teamBefore.revision(), null, null, LogoActionEnum.KEEP, null));
    assertThat(kept.revision()).isEqualTo(teamBefore.revision());
    SportingPresentation.View renamed =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.TEAM,
            team,
            new Edit(teamBefore.revision(), "Independent team", null, LogoActionEnum.KEEP, null));
    assertThat(renamed.names().effectiveName()).isEqualTo("Independent team");
    assertThat(reads.publicLogo(SportingProjectionChanges.Kind.TEAM, team).orElseThrow().bytes())
        .isEqualTo(second.bytes());
  }

  @Test
  @DisplayName("Edits team fields without waiting for its inherited club artwork lock")
  void editsTeamIndependentlyOfClub() {
    // Given
    SportingPresentation.View current =
        configurationReads.presentation(account, SportingProjectionChanges.Kind.TEAM, team);
    TransactionTemplate parent = new TransactionTemplate(transactions);
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      parent.executeWithoutResult(
          status -> {
            sql.queryForObject(
                "SELECT id FROM sporting_club WHERE id=? FOR UPDATE", UUID.class, club);

            // When: the parent lock stays held while the independent team command must finish.
            Future<SportingPresentation.View> pending =
                worker.submit(
                    () ->
                        presentation.set(
                            account,
                            SportingProjectionChanges.Kind.TEAM,
                            team,
                            new Edit(
                                current.revision(),
                                "Independent team",
                                null,
                                LogoActionEnum.KEEP,
                                null)));

            // Then
            assertThatCode(() -> pending.get(5, TimeUnit.SECONDS)).doesNotThrowAnyException();
          });
    }
    assertThat(
            configurationReads
                .presentation(account, SportingProjectionChanges.Kind.TEAM, team)
                .names()
                .effectiveName())
        .isEqualTo("Independent team");
  }

  @Test
  @DisplayName("Professional artwork follows manual team then LNV then optional club then absence")
  void resolvesProfessionalArtwork() throws Exception {
    // Given
    Professional professional = professional();
    Image clubImage =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    Image lnvImage =
        new ValidateSportingImage().validate(SportingImageFixture.image("JPEG", 0x445566));
    Image manualImage =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x778899));
    assertThat(reads.publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team()))
        .isEmpty();
    presentation.set(
        account,
        SportingProjectionChanges.Kind.CLUB,
        club,
        new Edit("0", null, null, LogoActionEnum.REPLACE, clubImage));
    // Synthetic exact technical association; ingestion never writes this optional relation.
    sql.update("UPDATE sporting_team SET club_id=? WHERE id=?", club, professional.team());
    assertThat(
            reads
                .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                .orElseThrow()
                .bytes())
        .isEqualTo(clubImage.bytes());
    SportingPresentation.View initial =
        configurationReads.presentation(
            account, SportingProjectionChanges.Kind.TEAM, professional.team());
    presentation.set(
        account,
        SportingProjectionChanges.Kind.TEAM,
        professional.team(),
        new Edit(initial.revision(), null, null, LogoActionEnum.REPLACE, manualImage));

    // When
    images.requireSource(professional.team(), context(professional.cycle(), 1));
    images.acceptSource(professional.team(), context(professional.cycle(), 1), lnvImage);
    Image stillManual =
        reads.publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team()).orElseThrow();
    SportingPresentation.View current =
        configurationReads.presentation(
            account, SportingProjectionChanges.Kind.TEAM, professional.team());
    assertThat(
            reads
                .publicTeamLogo(professional.team(), TeamLogoSelectionEnum.AUTOMATIC)
                .orElseThrow()
                .bytes())
        .isEqualTo(lnvImage.bytes());
    assertThat(
            reads
                .publicTeamLogo(professional.team(), TeamLogoSelectionEnum.EFFECTIVE)
                .orElseThrow()
                .bytes())
        .isEqualTo(manualImage.bytes());
    SportingPresentation.View automatic =
        presentation.set(
            account,
            SportingProjectionChanges.Kind.TEAM,
            professional.team(),
            new Edit(current.revision(), null, null, LogoActionEnum.AUTOMATIC, null));

    // Then
    assertThat(stillManual.bytes()).isEqualTo(manualImage.bytes());
    assertThat(current.logo().automaticUrl())
        .isEqualTo("/teams/" + professional.team() + "/logo?selection=automatic");
    assertThat(automatic.logo().manualUrl()).isNull();
    assertThat(
            reads
                .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                .orElseThrow()
                .bytes())
        .isEqualTo(lnvImage.bytes());
    assertThat(acquisitionReads.team(professional.team()).orElseThrow().clubId()).isEqualTo(club);
    assertThat(
            images
                .acceptSource(professional.team(), context(professional.cycle(), 1), clubImage)
                .outcome())
        .isEqualTo(ObservationOutcomeEnum.UNCHANGED);
    assertThat(
            reads
                .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                .orElseThrow()
                .bytes())
        .isEqualTo(lnvImage.bytes());
    assertThatThrownBy(() -> new ValidateSportingImage().validate(new byte[] {1, 2, 3}))
        .isInstanceOf(SportingValidationException.class);
    assertThat(
            reads
                .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                .orElseThrow()
                .bytes())
        .isEqualTo(lnvImage.bytes());
  }

  @Test
  @DisplayName(
      "A failed or stale source image preserves the independently accepted match and valid logo")
  void isolatesSourceArtworkFailure() throws Exception {
    // Given
    Professional professional = professional();
    Image original =
        new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    Image older = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x445566));
    images.acceptSource(professional.team(), context(professional.cycle(), 3), original);
    SportingPresentation.View before =
        configurationReads.presentation(
            account, SportingProjectionChanges.Kind.TEAM, professional.team());

    // When
    ObservationOutcome stale =
        images.acceptSource(professional.team(), context(professional.cycle(), 2), older);
    ObservationOutcome refreshed =
        images.acceptSource(professional.team(), context(professional.cycle(), 4), original);

    // Then
    assertThat(stale.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(refreshed.outcome()).isEqualTo(ObservationOutcomeEnum.UNCHANGED);
    assertThat(
            configurationReads
                .presentation(account, SportingProjectionChanges.Kind.TEAM, professional.team())
                .revision())
        .isEqualTo(before.revision());
    assertThat(acquisitionReads.match(professional.match())).isPresent();
    assertThat(
            reads
                .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                .orElseThrow()
                .bytes())
        .isEqualTo(original.bytes());
  }

  @Test
  @DisplayName("Keeps the current F01 incarnation fenced through the source-image commit")
  void holdsSourceImageFenceThroughCommit() throws Exception {
    // Given
    Professional professional = professional();
    Image image = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    CompletableFuture<Integer> pid = new CompletableFuture<>();
    TransactionTemplate transaction = new TransactionTemplate(transactions);
    long revision = collectionWork.current().revision();
    try (ExecutorService worker = Executors.newSingleThreadExecutor()) {
      // When
      Future<?> startup =
          transaction.execute(
              status -> {
                images.acceptSource(professional.team(), context(professional.cycle(), 1), image);
                Future<?> pending =
                    worker.submit(
                        () ->
                            transaction.executeWithoutResult(
                                other -> {
                                  pid.complete(
                                      sql.queryForObject("SELECT pg_backend_pid()", Integer.class));
                                  runtimes.register(
                                      revision,
                                      UUID.fromString("00000000-0000-4000-8000-000000000999"));
                                }));
                PostgresTestDatabase.awaitBlocked(sql, pid);
                return pending;
              });
      startup.get(15, TimeUnit.SECONDS);

      // Then
      assertThat(
              reads
                  .publicLogo(SportingProjectionChanges.Kind.TEAM, professional.team())
                  .orElseThrow()
                  .bytes())
          .isEqualTo(image.bytes());
      assertThatThrownBy(
              () ->
                  images.acceptSource(professional.team(), context(professional.cycle(), 2), image))
          .isInstanceOf(CollectionConflictException.class);
    }
  }

  @Test
  @DisplayName(
      "Emits changed presentation/privacy scopes only after commit and expands retained dependents")
  void submitsCurrentPresentationScopes() throws Exception {
    // Given
    events.clear();
    Image image = new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233));
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              presentation.set(
                  account,
                  SportingProjectionChanges.Kind.CLUB,
                  club,
                  new Edit("0", "Manual club", null, LogoActionEnum.REPLACE, image));
              details.correct(
                  account,
                  club,
                  "0",
                  Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
              assertThat(events.stream(SportingProjectionChanges.Changed.class)).isEmpty();
            });

    // When
    Set<SportingProjectionChanges.Scope> changed =
        events.stream(SportingProjectionChanges.Changed.class)
            .flatMap(change -> change.scopes().stream())
            .collect(java.util.stream.Collectors.toSet());
    Set<SportingProjectionChanges.Scope> dependent = reads.projectionDependents(changed);

    // Then
    assertThat(changed)
        .contains(new SportingProjectionChanges.Scope(SportingProjectionChanges.Kind.CLUB, club));
    assertThat(dependent)
        .contains(
            new SportingProjectionChanges.Scope(SportingProjectionChanges.Kind.TEAM, team),
            new SportingProjectionChanges.Scope(SportingProjectionChanges.Kind.POOL, scope.pool()));
    assertThat(reads.publicInputs(Kind.TEAM, Set.of(team)))
        .singleElement()
        .satisfies(
            input -> {
              assertThat(input.clubName()).isEqualTo("Manual club");
              assertThat(input.city()).isEqualTo("Paris");
            });
  }

  /**
   * Creates a clubless professional team in a real admitted LNV calendar cycle using synthetic
   * URLs. No external request occurs; this fixture qualifies current backend admission only.
   *
   * @return exact current professional sporting/cycle identities
   */
  private Professional professional() {
    UUID pool =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.LNV,
                    scope.season(),
                    "SYNTHETIC-LNV",
                    "COMP",
                    null,
                    null,
                    "LNV"),
                "LNV-PACK",
                "Professional",
                acquisitionReads.pool(scope.pool()).orElseThrow().classification())
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=193',setting_division_id=?,setting_format='_6X6',setting_gender='MALE' WHERE id=?",
        SportingIngestionFixture.DIVISION,
        pool);
    UUID source = UUID.randomUUID();
    UUID control = UUID.randomUUID();
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) VALUES (?,?,'LNV','SYNTHETIC-LNV','https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=193','QUALIFIED',TRUE,TRUE)",
        source,
        scope.season());
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'LNV',TRUE)",
        control,
        scope.season());
    CollectionState.Cycle cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(),
                    collectionWork.current().incarnationId(),
                    control,
                    null,
                    0,
                    null))
            .cycle();
    com.blockout.backend.sporting.application.model.SportingViews.MatchView match =
        identities.identifyMatch(
            pool,
            "LNV-MATCH",
            new TeamCandidate("TEAM-193", "Professional home", null, null),
            new TeamCandidate("TEAM-194", "Professional away", null, null));
    return new Professional(match.homeTeamId(), match.id(), cycle);
  }

  /** Exact seasonal sporting identities and current F01 calendar capability for artwork cases. */
  private record Professional(UUID team, UUID match, CollectionState.Cycle cycle) {}

  @Test
  @DisplayName("Division presentation preserves explicit inactivity and matching no-op revision")
  void preservesInactiveDivisionPresentation() {
    // Given
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000195");
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Inactive',FALSE,'#112233')",
        division);
    SportingPresentation.DivisionEdit edit =
        new SportingPresentation.DivisionEdit(
            "0", "Renamed", "#445566", null, LogoActionEnum.KEEP, null);

    // When
    DivisionDetail changed = presentation.setDivision(account, division, edit);
    DivisionDetail noOp =
        presentation.setDivision(
            account,
            division,
            new SportingPresentation.DivisionEdit(
                Long.toString(changed.revision()),
                "Renamed",
                "#445566",
                null,
                LogoActionEnum.KEEP,
                null));

    // Then
    assertThat(changed.active()).isFalse();
    assertThat(changed.name()).isEqualTo("Renamed");
    assertThat(noOp).isEqualTo(changed);
  }

  @Test
  @DisplayName("A duplicate division rename rolls back the whole presentation change")
  void rejectsDuplicateDivisionRename() {
    // Given
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000195");
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Original',FALSE,'#112233')",
        division);
    DivisionDetail before = configurationReads.division(account, division);

    // When
    ThrowingCallable rename =
        () ->
            presentation.setDivision(
                account,
                division,
                new SportingPresentation.DivisionEdit(
                    "0", "synthetic", "#445566", null, LogoActionEnum.KEEP, null));

    // Then
    assertThatThrownBy(rename).isInstanceOf(SportingConflictException.class);
    assertThat(configurationReads.division(account, division)).isEqualTo(before);
  }

  /**
   * Authenticates the fixture operator while authorization still reads its persisted grants.
   *
   * @return Spring Security's native JWT request postprocessor for the established operator
   */
  private JwtRequestPostProcessor operator() {
    return jwt()
        .jwt(
            token ->
                token
                    .issuer("https://identity.example.invalid/")
                    .subject("auth0|presentation")
                    .claim("azp", "mobile-test"));
  }

  /**
   * Admits one real seasonless family after scenario-owned current clubs/locality are established.
   *
   * @param family canonical F01 family name for the scenario
   * @return running backend-selected current targets
   */
  private CollectionState.Cycle admitFamily(String family) {
    UUID control = UUID.randomUUID();
    sql.update(
        "INSERT INTO collection_control(id,family,enabled) VALUES (?,?,TRUE)", control, family);
    return cycles
        .admit(
            new CollectionState.StartCycle(
                UUID.randomUUID(),
                collectionWork.current().incarnationId(),
                control,
                null,
                0,
                null))
        .cycle();
  }

  /**
   * Supplies independent observation attribution without inventing a provider publication time.
   *
   * @param cycle scenario's real admitted cycle
   * @param ordinal assigned logical read position
   * @return immutable current observation context
   */
  private MatchObservation.Context context(CollectionState.Cycle cycle, long ordinal) {
    return new MatchObservation.Context(
        cycle.id(), ordinal, Instant.parse("2026-10-24T12:00:00Z"), null);
  }
}
