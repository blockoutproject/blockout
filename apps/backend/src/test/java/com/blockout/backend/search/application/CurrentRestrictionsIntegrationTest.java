package com.blockout.backend.search.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.CONTROL;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.SOURCE;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.Edit;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptCatalog;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * F02 T041 across admitted mutations, F03/F06 HTTP consumers and native F04 catch-up. Only time and
 * synthetic source/identity inputs are controlled. Explicit execution delays projection work; the
 * real transaction handoff supplies its scopes. No owner read or writer is replaced.
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
@DisplayName("Current restrictions across consultation, native search and personal follows")
class CurrentRestrictionsIntegrationTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000213");
  private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");
  private static final LocalDate DAY = LocalDate.of(2026, 11, 2);
  // Reuse F13's native adapter configuration in a separately owned disposable engine/context.
  private static final String PREFIX = "blockout-local-search-issue212";
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private ReadCollectionSeasons seasonReads;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private AcceptCalendar calendars;
  @Autowired private AcceptCatalog catalogs;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private ReadSportingConfiguration configuration;
  @Autowired private ChangeCollectionControls controls;
  @Autowired private CloseCollectionSeason closure;
  @Autowired private RecordCollectionResults results;
  @Autowired private FollowState follows;
  @Autowired private ProjectSearch projection;
  @Autowired private SearchTestEngine engine;
  @Autowired private ApplicationEvents events;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @MockitoBean private Clock clock;
  private SportingIngestionFixture.Scope scope;

  /** Resets only the disposable context and admits its current synthetic F01 capability. */
  @BeforeEach
  void prepare() throws Exception {
    when(clock.instant()).thenReturn(NOW);
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM collection_control");
    sql.update("DELETE FROM account");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email,principal_created_at) VALUES (?, 'https://identity.example.invalid/', 'issue213', 'Issue213', 'synthetic@example.invalid', '2020-01-01T00:00:00Z')",
        ACCOUNT);
    for (String grant :
        List.of("division-lifecycle.manage", "collection.manage", "sporting-presentation.manage")) {
      sql.update(
          "INSERT INTO account_permission(account_id,permission) VALUES (?,?)", ACCOUNT, grant);
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"catalog", "calendar", "division"})
  @DisplayName("Each admitted restriction defeats old candidates and retains original follows")
  void restrictsBeforeCatchUp(String cause) throws Exception {
    // Given
    ObservationOutcome first =
        calendars.accept(scope.pool(), calendar(1, "M1")).outcomes().getFirst();
    presentation.set(
        ACCOUNT,
        SportingProjectionChanges.Kind.TEAM,
        first.homeTeamId(),
        new Edit(
            configuration
                .presentation(ACCOUNT, SportingProjectionChanges.Kind.TEAM, first.homeTeamId())
                .revision(),
            null,
            null,
            LogoActionEnum.REPLACE,
            new ValidateSportingImage().validate(SportingImageFixture.image("PNG", 0x112233))));
    mvc.perform(get("/teams/" + first.homeTeamId() + "/logo")).andExpect(status().isOk());
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();
    assertVisible(first);
    events.clear();

    // When
    switch (cause) {
      case "catalog" ->
          catalogs.accept(SOURCE, new CatalogObservation(context(2), true, List.of()));
      case "calendar" -> calendars.accept(scope.pool(), calendar(2));
      case "division" -> activity(false);
      default -> throw new IllegalArgumentException("Unsupported scenario cause");
    }

    // Then: current reads reject the retained candidate before any engine catch-up.
    assertThat(indexed("pools", scope.pool())).isTrue();
    assertThat(indexed("teams", first.homeTeamId())).isTrue();
    assertHidden(first);
    assertThat(relations()).containsExactlyElementsOf(retained);

    // When: queued identities execute through the actual current-input projection owner.
    catchUp();

    // Then
    assertThat(indexed("pools", scope.pool())).isFalse();
    assertThat(indexed("teams", first.homeTeamId())).isFalse();
    events.clear();
    switch (cause) {
      case "catalog" -> catalogReturn(3);
      case "calendar" -> {
        ObservationOutcome returned =
            calendars.accept(scope.pool(), calendar(3, "M1")).outcomes().getFirst();
        assertThat(returned.resourceId()).isEqualTo(first.resourceId());
        assertThat(returned.homeTeamId()).isEqualTo(first.homeTeamId());
      }
      case "division" -> activity(true);
      default -> throw new IllegalArgumentException("Unsupported scenario cause");
    }
    assertVisible(first);
    assertThat(relations()).containsExactlyElementsOf(retained);
    catchUp();
    assertThat(indexed("teams", first.homeTeamId())).isTrue();
    assertThat(read("/teams?q=home").at("/teams/0/team/id").asString())
        .isEqualTo(first.homeTeamId().toString());
    String previous = generation();
    projection.rebuild();
    assertThat(generation()).isNotEqualTo(previous);
    assertVisible(first);
    assertThat(relations()).containsExactlyElementsOf(retained);
  }

  @Test
  @DisplayName("Reappearance clears only its own cause across every current consumer")
  void retainsOtherRestrictions() throws Exception {
    // Given
    ObservationOutcome first =
        calendars.accept(scope.pool(), calendar(1, "M1")).outcomes().getFirst();
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();
    calendars.accept(scope.pool(), calendar(2));
    catalogs.accept(SOURCE, new CatalogObservation(context(3), true, List.of()));
    activity(false);

    // When: catalog presence and division reactivation cannot lift calendar emptiness.
    catalogReturn(4);
    activity(true);

    // Then
    assertHidden(first);
    catchUp();
    assertThat(indexed("teams", first.homeTeamId())).isFalse();

    // When: a nonempty calendar cannot lift an independent division restriction.
    activity(false);
    ObservationOutcome returned =
        calendars.accept(scope.pool(), calendar(5, "M1")).outcomes().getFirst();

    // Then
    assertThat(returned.resourceId()).isEqualTo(first.resourceId());
    assertHidden(first);
    projection.rebuild();
    assertThat(indexed("pools", scope.pool())).isFalse();
    activity(true);
    assertVisible(first);
    assertThat(relations()).containsExactlyElementsOf(retained);
    catchUp();
    assertThat(indexed("pools", scope.pool())).isTrue();
  }

  @Test
  @DisplayName("Individual withdrawal defeats team and pool feed selection without replacement")
  void withdrawsOnlyMissingItem() throws Exception {
    // Given
    ObservationOutcome.Calendar initial = calendars.accept(scope.pool(), calendar(1, "M1", "M2"));
    ObservationOutcome first = initial.outcomes().getFirst();
    UUID remaining = initial.outcomes().getLast().resourceId();
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();

    // When
    ObservationOutcome.Calendar changed = calendars.accept(scope.pool(), calendar(2, "M2"));

    // Then: the shared team and pool remain usable, but neither follow exposes the old match.
    assertThat(changed.absenceReconciled()).isTrue();
    unavailable("/matches/" + first.resourceId());
    assertThat(
            read(calendarPath("poolId=" + scope.pool()))
                .at("/days/0/pools/0/matches/0/id")
                .asString())
        .isEqualTo(remaining.toString());
    assertThat(read(personal("matches")).toString())
        .contains(remaining.toString())
        .doesNotContain(first.resourceId().toString());
    assertThat(read(personal("team-follows")).toString()).contains(first.homeTeamId().toString());
    assertThat(relations()).containsExactlyElementsOf(retained);
    catchUp();
    assertThat(indexed("teams", first.homeTeamId())).isTrue();

    // When: a different encounter does not inherit the retained old encounter's identity.
    ObservationOutcome replacement =
        calendars.accept(scope.pool(), calendar(3, "M3")).outcomes().getFirst();

    // Then
    assertThat(replacement.resourceId()).isNotEqualTo(first.resourceId());
    unavailable("/matches/" + first.resourceId());
    assertThat(relations()).containsExactlyElementsOf(retained);
    ObservationOutcome restored =
        calendars.accept(scope.pool(), calendar(4, "M1")).outcomes().getFirst();
    assertThat(restored.resourceId()).isEqualTo(first.resourceId());
    assertVisible(first);
  }

  @Test
  @DisplayName("A retained final result cannot expose a withdrawn match in completed calendars")
  void withdrawsScoredItem() throws Exception {
    // Given
    CalendarObservation.Match base = candidate("SCORED", "Home", DAY);
    MatchObservation.Facts scored =
        new MatchObservation.Facts(
            base.facts().localDate(),
            JsonNullable.undefined(),
            null,
            JsonNullable.of(new MatchObservation.Result(ResultStateEnum.FINAL, 3, 1, null)),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined(),
            JsonNullable.undefined());
    ObservationOutcome first =
        calendars
            .accept(
                scope.pool(),
                new CalendarObservation(
                    context(1),
                    true,
                    List.of(
                        new CalendarObservation.Match(
                            "SCORED", base.home(), base.away(), scored, null),
                        candidate("M2", "Home", DAY)),
                    List.of(),
                    List.of()))
            .outcomes()
            .getFirst();
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();
    String completed = calendarPath("poolId=" + scope.pool()).replace("upcoming", "completed");
    String personalCompleted = personal("matches") + "?category=completed&timeZone=Europe/Paris";
    assertThat(read(completed).toString()).contains(first.resourceId().toString());
    assertThat(read(personalCompleted).toString()).contains(first.resourceId().toString());

    // When
    calendars.accept(scope.pool(), calendar(2, "M2"));

    // Then
    unavailable("/matches/" + first.resourceId());
    assertThat(read(completed).get("days").isEmpty()).isTrue();
    assertThat(read(personalCompleted).get("calendar").get("days").isEmpty()).isTrue();
    assertThat(
            sql.queryForObject(
                "SELECT home_sets FROM sporting_match WHERE id=?",
                Integer.class,
                first.resourceId()))
        .isEqualTo(3);
    catchUp();
    assertThat(relations()).containsExactlyElementsOf(retained);
  }

  @Test
  @DisplayName("An identically named team in another season never receives retained follows")
  void retainsOriginalSeasonalTarget() throws Exception {
    // Given
    ObservationOutcome first =
        calendars.accept(scope.pool(), calendar(1, "M1")).outcomes().getFirst();
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
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
                    "POOL"),
                "PACK",
                "Synthetic pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    UUID nextTeam =
        identities
            .identifyMatch(
                nextPool,
                "M1",
                candidate("M1", "Home", DAY).home(),
                candidate("M1", "Home", DAY).away())
            .homeTeamId();
    projection.rebuild();

    // When
    calendars.accept(scope.pool(), calendar(2));

    // Then
    read("/teams/" + nextTeam);
    assertThat(read("/teams?q=home").toString())
        .contains(nextTeam.toString())
        .doesNotContain(first.homeTeamId().toString());
    assertThat(read(personal("team-follows")).get("items").isEmpty()).isTrue();
    assertThat(read(personal("matches")).get("hasAvailableFollows").asBoolean()).isFalse();
    assertThat(
            follows.read(
                new FollowContext(
                    ACCOUNT, new FollowContext.Target(FollowContext.TargetType.TEAM, nextTeam))))
        .isFalse();
    assertThat(relations()).containsExactlyElementsOf(retained);
    catchUp();
    ObservationOutcome returned =
        calendars.accept(scope.pool(), calendar(3, "M1")).outcomes().getFirst();
    assertThat(returned.homeTeamId()).isEqualTo(first.homeTeamId()).isNotEqualTo(nextTeam);
    assertVisible(first);
    assertThat(relations()).containsExactlyElementsOf(retained);
  }

  @Test
  @DisplayName("Another admitted participation keeps the same team and its personal selection")
  void retainsOtherParticipation() throws Exception {
    // Given: both pools are in the capability snapshot before either calendar is processed.
    UUID other =
        identities
            .createPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    scope.season(),
                    "SYNTHETIC",
                    "COMP",
                    null,
                    null,
                    "OTHER"),
                "PACK",
                "Other pool",
                new SportingClassification(DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    sql.update(
        "UPDATE sporting_pool SET calendar_url='https://www.ffvbbeach.org/ffvbapp/resu/other',setting_division_id=?,setting_format='_6X6',setting_gender='MALE' WHERE id=?",
        DIVISION,
        other);
    UUID startup = UUID.randomUUID();
    runtimes.register(
        sql.queryForObject("SELECT revision FROM collector_runtime WHERE id=1", Long.class),
        startup);
    CollectionState.Cycle cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(),
                    startup,
                    CONTROL,
                    null,
                    sql.queryForObject(
                        "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL),
                    null))
            .cycle();
    scope = new SportingIngestionFixture.Scope(scope.season(), scope.pool(), cycle);
    ObservationOutcome first =
        calendars.accept(scope.pool(), calendar(1, "M1")).outcomes().getFirst();
    ObservationOutcome second = calendars.accept(other, calendar(2, "M2")).outcomes().getFirst();
    assertThat(second.homeTeamId()).isEqualTo(first.homeTeamId());
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();

    // When
    calendars.accept(scope.pool(), calendar(3));

    // Then
    unavailable("/pools/" + scope.pool());
    unavailable("/matches/" + first.resourceId());
    assertThat(read("/teams/" + first.homeTeamId()).toString())
        .contains(other.toString())
        .doesNotContain(scope.pool().toString());
    assertThat(read(personal("team-follows")).toString()).contains(first.homeTeamId().toString());
    assertThat(read(personal("pool-follows")).get("items").isEmpty()).isTrue();
    assertThat(read(personal("matches")).toString())
        .contains(second.resourceId().toString())
        .doesNotContain(first.resourceId().toString());
    catchUp();
    assertThat(indexed("teams", first.homeTeamId())).isTrue();
    assertThat(indexed("pools", scope.pool())).isFalse();
    assertThat(relations()).containsExactlyElementsOf(retained);
  }

  @Test
  @DisplayName("Pauses and terminal closure preserve current historical consultation and follows")
  void preservesClosedHistory() throws Exception {
    // Given
    ObservationOutcome first =
        calendars.accept(scope.pool(), calendar(1, "M1")).outcomes().getFirst();
    follow(first.homeTeamId(), scope.pool());
    List<Map<String, Object>> retained = relations();
    projection.rebuild();

    // When
    controls.setActivity(
        ACCOUNT,
        CONTROL,
        sql.queryForObject(
            "SELECT revision FROM collection_control WHERE id=?", Long.class, CONTROL),
        false);
    assertVisible(first);
    closure.close(
        ACCOUNT,
        scope.season(),
        seasonReads.collectionState(scope.season()).collectionRevision(),
        "2026/2027");
    calendars.accept(scope.pool(), calendar(2, "M1"));
    results.complete(scope.cycle().id(), NOW.plusSeconds(10));

    // Then
    assertVisible(first);
    assertThat(read(personal("team-follows") + "?seasonId=" + scope.season()).toString())
        .contains(first.homeTeamId().toString());
    assertThatThrownBy(() -> calendars.accept(scope.pool(), calendar(3)))
        .isInstanceOf(CollectionConflictException.class);
    assertThatThrownBy(
            () ->
                cycles.admit(
                    new CollectionState.StartCycle(
                        UUID.randomUUID(),
                        scope.cycle().incarnationId(),
                        CONTROL,
                        null,
                        sql.queryForObject(
                            "SELECT revision FROM collection_control WHERE id=?",
                            Long.class,
                            CONTROL),
                        null)))
        .isInstanceOf(CollectionConflictException.class);
    projection.rebuild();
    assertThat(indexed("teams", first.homeTeamId())).isTrue();
    assertThat(relations()).containsExactlyElementsOf(retained);
  }

  /**
   * Checks every public/personal hiding boundary while the original relationship rows remain.
   *
   * @param first original admitted match and participant identities
   */
  private void assertHidden(ObservationOutcome first) throws Exception {
    unavailable("/matches/" + first.resourceId());
    unavailable("/teams/" + first.homeTeamId());
    unavailable("/teams/" + first.homeTeamId() + "/logo");
    unavailable("/pools/" + scope.pool());
    unavailable("/pools/" + scope.pool() + "/participants");
    unavailable("/pools/" + scope.pool() + "/standings");
    unavailable(calendarPath("poolId=" + scope.pool()));
    unavailable(calendarPath("teamId=" + first.homeTeamId()));
    assertThat(read("/teams?q=home").get("teams").isEmpty()).isTrue();
    assertThat(read("/pools?q=synthetic").get("pools").isEmpty()).isTrue();
    assertThat(read("/teams?exampleIds=" + first.homeTeamId()).get("teams").isEmpty()).isTrue();
    assertThat(read(personal("team-follows")).get("items").isEmpty()).isTrue();
    assertThat(read(personal("pool-follows")).get("items").isEmpty()).isTrue();
    assertThat(read(personal("matches")).get("calendar").get("days").isEmpty()).isTrue();
    assertThat(read(personal("follow-options")).get("seasons").isEmpty()).isTrue();
    UUID club =
        sql.queryForObject(
            "SELECT club_id FROM sporting_team WHERE id=?", UUID.class, first.homeTeamId());
    read("/clubs/" + club);
    assertThat(read("/clubs/" + club + "/teams?seasonId=" + scope.season()).get("items").isEmpty())
        .isTrue();
  }

  /**
   * Checks actual effective resources and F06 composition without relying on index freshness.
   *
   * @param first original admitted match and participant identities
   */
  private void assertVisible(ObservationOutcome first) throws Exception {
    read("/matches/" + first.resourceId());
    read("/teams/" + first.homeTeamId());
    read("/pools/" + scope.pool());
    assertThat(read(calendarPath("poolId=" + scope.pool())).toString())
        .contains(first.resourceId().toString());
    assertThat(read(personal("team-follows")).toString()).contains(first.homeTeamId().toString());
    assertThat(read(personal("pool-follows")).toString()).contains(scope.pool().toString());
    assertThat(read(personal("matches")).toString()).contains(first.resourceId().toString());
    assertThat(read(personal("follow-options")).toString()).contains(scope.season().toString());
  }

  /** Executes exactly the committed scopes through native F04 current reads and bulk writes. */
  private void catchUp() {
    Set<SportingProjectionChanges.Scope> scopes =
        events.stream(SportingProjectionChanges.Changed.class)
            .flatMap(change -> change.scopes().stream())
            .collect(Collectors.toSet());
    assertThat(scopes).isNotEmpty();
    projection.update(scopes);
  }

  /**
   * * Creates real desired-state relations, preserving the original owner and resource identities.
   *
   * @param team exact seasonal target
   * @param pool exact pool target
   */
  private void follow(UUID team, UUID pool) {
    follows.replace(
        new FollowContext(ACCOUNT, new FollowContext.Target(FollowContext.TargetType.TEAM, team)),
        true);
    follows.replace(
        new FollowContext(ACCOUNT, new FollowContext.Target(FollowContext.TargetType.POOL, pool)),
        true);
  }

  /** Reads complete original relation tuples, detecting deletion, recreation or target transfer. */
  private List<Map<String, Object>> relations() {
    return sql.queryForList(
        "SELECT id,account_id,team_id AS target,'team' AS kind FROM team_follow UNION ALL SELECT id,account_id,pool_id,'pool' FROM pool_follow ORDER BY kind,id");
  }

  /**
   * Applies the actual current division command at the latest editing revision.
   *
   * @param active desired independent division activity
   */
  private void activity(boolean active) {
    divisions.setActive(
        ACCOUNT,
        DIVISION,
        sql.queryForObject(
            "SELECT revision::TEXT FROM sporting_division WHERE id=?", String.class, DIVISION),
        active);
  }

  /**
   * Supplies complete attributable rediscovery of the same contextual pool identity.
   *
   * @param ordinal catalog pre-read order within the admitted cycle
   */
  private void catalogReturn(long ordinal) {
    catalogs.accept(
        SOURCE,
        new CatalogObservation(
            context(ordinal),
            true,
            List.of(
                new CatalogObservation.Pool(
                    "PACK", "COMP", "POOL", null, null, null, null, "Synthetic pool"))));
  }

  /**
   * Constructs one complete synthetic calendar, with source identities explicit at the call.
   *
   * @param ordinal calendar pre-read order
   * @param references exact encounters; empty means qualified current emptiness
   */
  private CalendarObservation calendar(long ordinal, String... references) {
    return new CalendarObservation(
        context(ordinal),
        true,
        java.util.Arrays.stream(references)
            .map(reference -> candidate(reference, "Home", DAY))
            .toList(),
        List.of(),
        List.of());
  }

  /**
   * Carries real admitted scope and explicit logical pre-read order; no publication time is
   * inferred.
   *
   * @param ordinal logical pre-read order
   */
  private MatchObservation.Context context(long ordinal) {
    return new MatchObservation.Context(
        scope.cycle().id(), ordinal, NOW.plusSeconds(ordinal), null);
  }

  /**
   * Selects the shared F03 upcoming calendar for the exact public target.
   *
   * @param target exact public target query parameter
   */
  private String calendarPath(String target) {
    return "/matches?" + target + "&category=upcoming&timeZone=Europe/Paris";
  }

  /**
   * Addresses a real original-account F06 collection without a duplicate reader.
   *
   * @param collection canonical account collection suffix
   */
  private String personal(String collection) {
    return "/accounts/" + ACCOUNT + "/" + collection;
  }

  /**
   * Reads production routes; personal routes retain real account/security admission with a
   * synthetic JWT.
   *
   * @param path canonical route and explicit scenario parameters
   */
  private JsonNode read(String path) throws Exception {
    MockHttpServletRequestBuilder request = get(path);
    if (path.startsWith("/accounts/")) {
      request.with(
          jwt()
              .jwt(
                  token ->
                      token
                          .issuer("https://identity.example.invalid/")
                          .subject("issue213")
                          .claim("azp", "mobile-test")));
      if (path.contains("/matches") && !path.contains("category="))
        request.param("category", "upcoming").param("timeZone", "Europe/Paris");
    }
    return json.readTree(
        mvc.perform(request)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /**
   * Verifies that an old public URL exposes no retained hidden representation.
   *
   * @param path exact old public URL
   */
  private void unavailable(String path) throws Exception {
    mvc.perform(get(path)).andExpect(status().isNotFound());
  }

  /**
   * Observes retained or deleted candidates independently of the current SQL hydration guard.
   *
   * @param kind native resource alias suffix
   * @param id exact retained sporting identity
   */
  private boolean indexed(String kind, UUID id) throws Exception {
    return engine
        .client
        .exists(request -> request.index(PREFIX + "-" + kind).id(id.toString()))
        .value();
  }

  /** Observes the real alias target to distinguish replacement from targeted catch-up. */
  private String generation() throws Exception {
    return engine
        .client
        .indices()
        .getAlias(request -> request.index(PREFIX + "-*").name(PREFIX + "-pools"))
        .result()
        .keySet()
        .iterator()
        .next();
  }
}
