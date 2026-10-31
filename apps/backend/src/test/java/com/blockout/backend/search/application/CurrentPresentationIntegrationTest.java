package com.blockout.backend.search.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.GeocodingOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.ClubObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingPresentation.Locality;
import com.blockout.backend.sporting.application.model.SportingPresentation.LocalityObservation;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptClubDetails;
import com.blockout.backend.sporting.application.service.AcceptClubLocality;
import com.blockout.backend.sporting.application.service.AcceptSourceImage;
import com.blockout.backend.sporting.application.service.ChangeClubContacts;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.application.service.RestrictClubContacts;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingImageFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * T041/T053 presentation chain through current F03 responses and actual F04 native projection.
 * Source facts, technical alias/club associations and private rights decisions are synthetic; no
 * live supplier or native device is involved. All application owners remain real.
 */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  CurrentSportingTruthIntegrationTest.ProjectionConfiguration.class
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Effective presentation and privacy through native search catch-up")
class CurrentPresentationIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000002130");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static final String PREFIX = "blockout-local-search-issue212";
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork work;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptClubDetails sources;
  @Autowired private ChangeClubContacts contacts;
  @Autowired private RestrictClubContacts restrictions;
  @Autowired private AcceptClubLocality localities;
  @Autowired private AcceptSourceImage images;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private ReadSportingConfiguration configuration;
  @Autowired private ReadSportingData sporting;
  @Autowired private ReadSportingAcquisition acquisition;
  @Autowired private ProjectSearch projection;
  @Autowired private SportingProjectionChanges changes;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private SearchTestEngine engine;
  @Autowired private ApplicationEvents events;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @MockitoBean private Clock clock;
  private SportingIngestionFixture.Scope scope;
  private UUID team;
  private UUID club;
  private UUID match;

  /**
   * Starts with real admitted sporting facts and current explicit synthetic operator permission.
   */
  @BeforeEach
  void prepare() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    sql.update("DELETE FROM account");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?, 'https://identity.example.invalid/', 'presentation213', 'Presentation213', 'synthetic@example.invalid')",
        ACCOUNT);
    sql.update(
        "INSERT INTO account_permission(account_id,permission) VALUES (?, 'sporting-presentation.manage')",
        ACCOUNT);
    ObservationOutcome first =
        calendars
            .accept(
                scope.pool(),
                new CalendarObservation(
                    context(scope.cycle(), 1),
                    true,
                    List.of(candidate("M1", "Home", LocalDate.of(2026, 11, 2))),
                    List.of(),
                    List.of()))
            .outcomes()
            .getFirst();
    match = first.resourceId();
    team = first.homeTeamId();
    club = acquisition.team(team).orElseThrow().clubId();
  }

  @Test
  @DisplayName(
      "Source, independent manual names and verified aliases reach actual public presentation")
  void projectsEffectiveNames() throws Exception {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    sources.accept(club, new ClubObservation(context(sheets, 1), "Source club", Map.of()));
    projection.rebuild();
    events.clear();

    // When: ordinary owner changes and a controlled technical alias correction commit.
    edit(Kind.CLUB, club, "Manual club", null, LogoActionEnum.KEEP, null);
    edit(Kind.TEAM, team, "Manual team", "Short team", LogoActionEnum.KEEP, null);
    edit(Kind.POOL, scope.pool(), "Manual pool", "Short pool", null, null);
    sources.accept(club, new ClubObservation(context(sheets, 2), "Current source club", Map.of()));
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.update(
                  "INSERT INTO sporting_team_alias(team_id,season_id,organizer_reference,competition_reference,comparison_name) VALUES (?,?,'SYNTHETIC','COMP','qualified alias')",
                  team,
                  scope.season());
              changes.submit(Kind.TEAM, team);
            });

    // Then: F03 and old native candidates expose current presentation before catch-up.
    assertThat(document("teams", team).names()).contains("Home").doesNotContain("Manual team");
    assertThat(read("/teams?q=home").at("/teams/0/team/name").asString()).isEqualTo("Manual team");
    JsonNode current = read("/matches/" + match);
    assertThat(current.at("/match/home/name").asString()).isEqualTo("Manual team");
    assertThat(current.toString()).contains("Manual pool", "Short team");
    assertThat(read("/teams/" + team).at("/team/club/name").asString()).isEqualTo("Manual club");
    catchUp();
    assertThat(document("teams", team).names())
        .contains("Home", "Manual team", "Short team", "qualified alias");
    assertThat(document("teams", team).context()).contains("Manual club");
    assertThat(document("clubs", club).names()).contains("Current source club", "Manual club");
    assertThat(document("pools", scope.pool()).names()).contains("Manual pool", "Short pool");
    assertThat(read("/teams?q=qualified%20alias").toString())
        .contains(team.toString(), "Manual team");

    // When: independent full-name restoration retains the manual short label.
    edit(Kind.TEAM, team, null, "Short team", LogoActionEnum.KEEP, null);
    edit(Kind.CLUB, club, null, null, LogoActionEnum.KEEP, null);

    // Then
    assertThat(read("/teams/" + team).toString())
        .contains("Home", "Short team", "Current source club");
    catchUp();
    assertThat(document("teams", team).names())
        .contains("Home", "Short team")
        .doesNotContain("Manual team");
    assertThat(document("teams", team).context())
        .contains("Current source club")
        .doesNotContain("Manual club");
  }

  @Test
  @DisplayName(
      "Field restriction removes effective locality before catch-up and rejects the old point")
  void restrictsCurrentLocality() throws Exception {
    // Given: fictitious contact values; no real erased value is retained or published.
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    sources.accept(
        club,
        new ClubObservation(
            context(sheets, 1),
            "Synthetic club",
            Map.of(
                ContactField.CITY, JsonNullable.of("Synthetic municipality"),
                ContactField.EMAIL, JsonNullable.of("synthetic@example.invalid"))));
    correct(
        Map.of(
            ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Synthetic municipality")));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    String localityRevision = sporting.publicLocality(club).orElseThrow().revision();
    localities.accept(
        club,
        new LocalityObservation(
            context(geocoding, 1), localityRevision, GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));
    projection.rebuild();
    events.clear();
    assertThat(read("/clubs?q=synthetic").get("clubs").size()).isEqualTo(1);
    events.clear();

    // When: the existing manual F11 application operation clears the targeted fields.
    restrictions.restrict(club, Set.of(ContactField.CITY, ContactField.EMAIL));
    correct(
        Map.of(
            ContactField.CITY, new ContactEdit(ContactModeEnum.SOURCE, null),
            ContactField.EMAIL, new ContactEdit(ContactModeEnum.SOURCE, null)));
    sources.accept(
        club,
        new ClubObservation(
            context(sheets, 2),
            null,
            Map.of(
                ContactField.CITY, JsonNullable.of("Synthetic municipality"),
                ContactField.EMAIL, JsonNullable.of("synthetic@example.invalid"))));
    ObservationOutcome late =
        localities.accept(
            club,
            new LocalityObservation(
                context(geocoding, 2),
                localityRevision,
                GeocodingOutcomeEnum.LOCATED,
                48.86,
                2.34));

    // Then: old native city candidates cannot be used, even by a query matching the name too.
    assertThat(document("clubs", club).city()).isNotNull();
    assertThat(read("/clubs?q=synthetic").get("clubs").isEmpty()).isTrue();
    assertThat(read("/teams?q=home").get("teams").isEmpty()).isTrue();
    JsonNode current = read("/clubs/" + club);
    assertThat(current.get("contacts").hasNonNull("city")).isFalse();
    assertThat(current.get("contacts").hasNonNull("email")).isFalse();
    assertThat(current.hasNonNull("location")).isFalse();
    assertThat(late.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(acquisition.acquisitionClubs(true, null))
        .extracting(reference -> reference.clubId())
        .doesNotContain(club);
    catchUp();
    assertThat(document("clubs", club).city()).isNull();
    assertThat(document("teams", team).city()).isNull();
    assertThat(read("/clubs?q=synthetic").toString()).contains(club.toString());
    assertThat(read("/clubs?q=municipality").get("clubs").isEmpty()).isTrue();
    projection.rebuild();
    events.clear();
    assertThat(document("clubs", club).city()).isNull();
    assertThat(read("/clubs/" + club).hasNonNull("location")).isFalse();
  }

  @Test
  @DisplayName("Street and masked source changes keep the current point without new geocoding need")
  void preservesUnchangedGeographicContext() throws Exception {
    // Given
    CollectionState.Cycle sheets = admitFamily("CLUB_SHEETS");
    sources.accept(
        club,
        new ClubObservation(
            context(sheets, 1), null, Map.of(ContactField.CITY, JsonNullable.of("Paris"))));
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.MANUAL, "Paris")));
    CollectionState.Cycle geocoding = admitFamily("GEOCODING");
    Locality original = sporting.publicLocality(club).orElseThrow();
    localities.accept(
        club,
        new LocalityObservation(
            context(geocoding, 1), original.revision(), GeocodingOutcomeEnum.LOCATED, 48.86, 2.34));
    projection.rebuild();
    events.clear();

    // When
    correct(
        Map.of(ContactField.ADDRESS, new ContactEdit(ContactModeEnum.MANUAL, "Synthetic street")));
    sources.accept(
        club,
        new ClubObservation(
            context(sheets, 2), null, Map.of(ContactField.CITY, JsonNullable.of("Lyon"))));

    // Then
    assertThat(sporting.publicLocality(club).orElseThrow().revision())
        .isEqualTo(original.revision());
    assertThat(acquisition.acquisitionClubs(true, null))
        .extracting(reference -> reference.clubId())
        .doesNotContain(club);
    assertThat(read("/clubs/" + club).at("/location/latitude").asDouble()).isEqualTo(48.86);
    catchUp();
    assertThat(document("teams", team).city()).isEqualTo("Paris");

    // When: explicit return to current source creates a new context, then old in-flight work
    // returns.
    correct(Map.of(ContactField.CITY, new ContactEdit(ContactModeEnum.SOURCE, null)));
    ObservationOutcome late =
        localities.accept(
            club,
            new LocalityObservation(
                context(geocoding, 2),
                original.revision(),
                GeocodingOutcomeEnum.LOCATED,
                48.86,
                2.34));

    // Then
    assertThat(late.outcome()).isEqualTo(ObservationOutcomeEnum.STALE);
    assertThat(read("/clubs/" + club).hasNonNull("location")).isFalse();
    catchUp();
    assertThat(document("teams", team).city()).isEqualTo("Lyon");
  }

  @Test
  @DisplayName("Inherited club logos span seasons while each team keeps its independent override")
  void presentsInheritedLogosAcrossSeasons() throws Exception {
    // Given
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
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    UUID nextTeam =
        identities
            .identifyMatch(
                nextPool,
                "NEXT",
                candidate("NEXT", "Home", null).home(),
                candidate("NEXT", "Home", null).away())
            .homeTeamId();
    Image clubLogo = image(0x112233);
    Image manual = image(0x445566);
    edit(Kind.CLUB, club, null, null, LogoActionEnum.REPLACE, clubLogo);
    edit(Kind.TEAM, team, null, null, LogoActionEnum.REPLACE, manual);
    projection.rebuild();
    events.clear();

    // When
    Image changed = image(0x778899);
    edit(Kind.CLUB, club, null, null, LogoActionEnum.REPLACE, changed);

    // Then: actual binary reads and actual candidate hydration resolve current inheritance.
    assertLogo(team, manual);
    assertLogo(nextTeam, changed);
    catchUp();
    JsonNode search = read("/teams?q=home");
    assertThat(search.toString()).contains(team.toString(), nextTeam.toString());
    for (JsonNode result : search.get("teams"))
      assertThat(result.get("team").hasNonNull("logoUrl")).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM sporting_team WHERE club_id=? AND logo IS NOT NULL",
                Long.class,
                club))
        .isEqualTo(1L);

    // When
    edit(Kind.TEAM, team, null, null, LogoActionEnum.AUTOMATIC, null);

    // Then
    assertLogo(team, changed);
    assertLogo(nextTeam, changed);
    catchUp();
    assertThat(read("/teams/" + team).at("/team/team").hasNonNull("logoUrl")).isTrue();
  }

  @Test
  @DisplayName(
      "Professional source artwork and names retain their priority through actual projection")
  void presentsProfessionalAutomaticLogo() throws Exception {
    // Given: a qualified clubless professional calendar, admitted by the real F01 owner.
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
                "Professional pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=193',setting_division_id=?,setting_format='_6X6',setting_gender='MALE' WHERE id=?",
        DIVISION,
        pool);
    sql.update(
        "INSERT INTO collection_source_binding(id,season_id,provider,organizer_reference,accepted_url,validation_state,locked,launched) VALUES (?,?,'LNV','SYNTHETIC-LNV','https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=193','QUALIFIED',TRUE,TRUE)",
        UUID.randomUUID(),
        scope.season());
    UUID control = UUID.randomUUID();
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'LNV',TRUE)",
        control,
        scope.season());
    CollectionState.Cycle professional =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), work.current().incarnationId(), control, null, 0, null))
            .cycle();
    CalendarObservation.Match candidate =
        new CalendarObservation.Match(
            "PRO",
            new TeamCandidate("PRO-HOME", "Professional home", null, null),
            new TeamCandidate("PRO-AWAY", "Professional away", null, null),
            candidate("PRO", "Home", LocalDate.of(2026, 11, 2)).facts(),
            null);
    ObservationOutcome initial =
        calendars
            .accept(
                pool,
                new CalendarObservation(
                    context(professional, 1), true, List.of(candidate), List.of(), List.of()))
            .outcomes()
            .getFirst();
    UUID proTeam = initial.homeTeamId();
    projection.rebuild();
    events.clear();
    assertThat(read("/teams/" + proTeam).get("team").hasNonNull("club")).isFalse();
    mvc.perform(get("/teams/" + proTeam + "/logo")).andExpect(status().isNotFound());
    Image clubLogo = image(0x112233);
    Image sourceLogo = image(0x445566);
    Image manualLogo = image(0x778899);
    edit(Kind.CLUB, club, null, null, LogoActionEnum.REPLACE, clubLogo);
    // Exact synthetic technical association; no source/name inference or public mutation API.
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.update("UPDATE sporting_team SET club_id=? WHERE id=?", club, proTeam);
              changes.submit(Kind.TEAM, proTeam);
            });
    assertLogo(proTeam, clubLogo);
    edit(
        Kind.TEAM, proTeam, "Manual professional", "Pro short", LogoActionEnum.REPLACE, manualLogo);
    events.clear();

    // When
    images.acceptSource(proTeam, context(professional, 2), sourceLogo);

    // Then
    assertLogo(proTeam, manualLogo);
    assertThat(
            mvc.perform(get("/teams/" + proTeam + "/logo?selection=automatic"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray())
        .isEqualTo(sourceLogo.bytes());
    catchUp();
    assertThat(read("/teams?q=professional").toString())
        .contains(proTeam.toString(), "Manual professional");

    // When: the current attributable native identity receives a source-name correction.
    CalendarObservation.Match corrected =
        new CalendarObservation.Match(
            "PRO",
            new TeamCandidate("PRO-HOME", "Corrected professional", null, null),
            candidate.away(),
            candidate.facts(),
            null);
    calendars.accept(
        pool,
        new CalendarObservation(
            context(professional, 3), true, List.of(corrected), List.of(), List.of()));
    edit(Kind.TEAM, proTeam, null, "Pro short", LogoActionEnum.AUTOMATIC, null);

    // Then
    assertLogo(proTeam, sourceLogo);
    catchUp();
    assertThat(document("teams", proTeam).names())
        .contains("Corrected professional", "Pro short")
        .doesNotContain("Manual professional");
    assertThat(read("/teams/" + proTeam).at("/team/team/name").asString())
        .isEqualTo("Corrected professional");
    assertThat(images.acceptSource(proTeam, context(professional, 1), clubLogo).outcome())
        .isEqualTo(ObservationOutcomeEnum.STALE);
    assertLogo(proTeam, sourceLogo);
    projection.rebuild();
    events.clear();
    assertLogo(proTeam, sourceLogo);
  }

  /**
   * Applies one full presentation command using the currently owned editor revision.
   *
   * @param kind exact sporting resource kind
   * @param id original resource identity
   * @param name desired full-name override, or null for automatic
   * @param shortName independent short-name override, or null
   * @param action desired manual artwork handling, absent for pools
   * @param image validated replacement bytes, otherwise null
   */
  private void edit(
      Kind kind, UUID id, String name, String shortName, LogoActionEnum action, Image image) {
    presentation.set(
        ACCOUNT,
        kind,
        id,
        new Edit(
            configuration.presentation(ACCOUNT, kind, id).revision(),
            name,
            shortName,
            action,
            image));
  }

  /**
   * Applies only the explicit independent contact choices at the current contacts revision.
   *
   * @param fields explicit independent contact choices
   */
  private void correct(Map<ContactField, ContactEdit> fields) {
    contacts.correct(
        ACCOUNT, club, Long.toString(configuration.clubContacts(ACCOUNT, club).revision()), fields);
  }

  /**
   * Admits one real seasonless source/geocoding family after the current club need exists.
   *
   * @param family existing F01 seasonless family name
   */
  private CollectionState.Cycle admitFamily(String family) {
    UUID control = UUID.randomUUID();
    sql.update(
        "INSERT INTO collection_control(id,family,enabled) VALUES (?,?,TRUE)", control, family);
    return cycles
        .admit(
            new CollectionState.StartCycle(
                UUID.randomUUID(), work.current().incarnationId(), control, null, 0, null))
        .cycle();
  }

  /**
   * Uses a real running capability and explicit pre-read order, without inferred source
   * publication.
   *
   * @param cycle real admitted capability
   * @param ordinal logical pre-read order
   */
  private MatchObservation.Context context(CollectionState.Cycle cycle, long ordinal) {
    return new MatchObservation.Context(cycle.id(), ordinal, NOW.plusSeconds(ordinal), null);
  }

  /** Runs committed handoff scopes through the production SQL input expansion and native writer. */
  private void catchUp() {
    Set<SportingProjectionChanges.Scope> scopes =
        events.stream(SportingProjectionChanges.Changed.class)
            .flatMap(change -> change.scopes().stream())
            .collect(Collectors.toSet());
    assertThat(scopes).isNotEmpty();
    projection.update(scopes);
    events.clear();
  }

  /**
   * Reads the actual active native document independently of public response hydration.
   *
   * @param kind native resource alias suffix
   * @param id exact sporting identity
   */
  private SearchDocuments document(String kind, UUID id) throws Exception {
    return engine
        .client
        .get(request -> request.index(PREFIX + "-" + kind).id(id.toString()), SearchDocuments.class)
        .source();
  }

  /**
   * Reads a current production F03/F04 public route with real response mapping.
   *
   * @param path canonical public route and explicit scenario parameters
   */
  private JsonNode read(String path) throws Exception {
    return json.readTree(
        mvc.perform(get(path))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /**
   * Creates validated small synthetic PNG content, without a provider image dependency.
   *
   * @param color synthetic PNG color distinguishing the expected bytes
   */
  private Image image(int color) throws Exception {
    return new ValidateSportingImage().validate(SportingImageFixture.image("PNG", color));
  }

  /**
   * * Compares effective bytes served by the real public image adapter to the expected owner
   * choice.
   *
   * @param id exact seasonal team identity
   * @param expected effective owner-selected image
   */
  private void assertLogo(UUID id, Image expected) throws Exception {
    assertThat(
            mvc.perform(get("/teams/" + id + "/logo"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray())
        .isEqualTo(expected.bytes());
  }
}
