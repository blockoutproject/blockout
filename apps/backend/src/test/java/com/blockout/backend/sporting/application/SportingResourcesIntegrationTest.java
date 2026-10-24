package com.blockout.backend.sporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.ConsultationReadPort.ClubSeasonRequest;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.ClubDetailsService;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import com.blockout.backend.sporting.support.SportingImageFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture.Scope;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Real F02 identities/effective values and migrated PostgreSQL; no provider or native evidence. */
@SpringBootTest
@Testcontainers
@DisplayName("Current public sporting projections")
class SportingResourcesIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadSportingResources resources;
  @Autowired private SportingReadService owners;
  @Autowired private SportingIdentityService identities;
  @Autowired private SeasonService seasons;
  @Autowired private ClubDetailsService contacts;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectorRuntimeService runtimes;
  private Scope scope;
  private MatchView match;
  private UUID club;

  /**
   * Migrates the disposable suite database before Hibernate validation.
   *
   * @param properties isolated datasource registration
   * @throws Exception if the migrated baseline fails
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /**
   * Creates exact current participants through F02, with explicit synthetic accepted schedule.
   *
   * @throws Exception if disposable fixture reset fails
   */
  @BeforeEach
  void prepareOwners() throws Exception {
    SportingIngestionFixture.reset(DATABASE);
    sql.update("DELETE FROM collection_control");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    match =
        identities.identifyMatch(
            scope.pool(),
            "READ",
            new TeamCandidate(null, "Zulu", "00203", "Club"),
            new TeamCandidate(null, "Away", "00204", "Other"));
    club = owners.team(match.homeTeamId()).orElseThrow().clubId();
    sql.update(
        "UPDATE sporting_match SET local_date='2026-10-24', schedule_observed_at='2026-10-20T12:00:00Z' WHERE id=?",
        match.id());
  }

  @Test
  @DisplayName("Uses effective contacts while refusing restricted source reappearance")
  void usesEffectivePermittedContacts() {
    // Given
    sql.update(
        "UPDATE sporting_club SET email='source@example.invalid', email_manual='corrected@example.invalid', email_mode='MANUAL', phone='0102030405', phone_mode='HIDDEN' WHERE id=?",
        club);

    // When
    ConsultationViews.ClubDetail corrected = resources.club(club);
    contacts.restrict(club, Set.of(ContactField.EMAIL));
    sql.update("UPDATE sporting_club SET email='reappeared@example.invalid' WHERE id=?", club);
    ConsultationViews.ClubDetail restricted = resources.club(club);

    // Then
    assertThat(corrected.contacts().email()).isEqualTo("corrected@example.invalid");
    assertThat(corrected.contacts().phone()).isNull();
    assertThat(restricted.contacts().email()).isNull();
  }

  @Test
  @DisplayName("Does not reuse a locality after its municipal context is restricted")
  void suppressesRestrictedLocality() {
    // Given
    sql.update(
        "UPDATE sporting_club SET municipality='Paris', municipality_mode='SOURCE', latitude=48.85, longitude=2.35 WHERE id=?",
        club);
    ConsultationViews.ClubDetail known = resources.club(club);

    // When
    contacts.restrict(club, Set.of(ContactField.CITY));
    ConsultationViews.ClubDetail restricted = resources.club(club);

    // Then
    assertThat(known.location()).isNotNull();
    assertThat(restricted.location()).isNull();
  }

  @Test
  @DisplayName("Orders future and closed club seasons from viewable teams only")
  void ordersViewableSeasons() {
    // Given
    UUID future = seasons.getOrCreate(2027).id();
    UUID past = seasons.getOrCreate(2024).id();
    UUID futurePool = pool(future, CollectionProviderEnum.FFVB, "FUTURE");
    UUID pastPool = pool(past, CollectionProviderEnum.FFVB, "PAST");
    identities.identifyMatch(
        futurePool,
        "F",
        new TeamCandidate(null, "Future", "00203", "Club"),
        new TeamCandidate(null, "Other", "00205", null));
    identities.identifyMatch(
        pastPool,
        "P",
        new TeamCandidate(null, "Past", "00203", "Club"),
        new TeamCandidate(null, "Other", "00206", null));
    sql.update("UPDATE sporting_season SET collection_state='CLOSED' WHERE id=?", past);

    // When
    ConsultationViews.ClubDetail before = resources.club(club);
    sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", futurePool);
    ConsultationViews.ClubDetail after = resources.club(club);

    // Then
    assertThat(before.seasons())
        .extracting(value -> value.id())
        .containsExactly(future, scope.season(), past);
    assertThat(after.seasons())
        .extracting(value -> value.id())
        .containsExactly(scope.season(), past);
    assertThat(resources.clubTeams(new ClubSeasonRequest(club, future)).items()).isEmpty();
    assertThatThrownBy(() -> resources.clubTeams(new ClubSeasonRequest(club, UUID.randomUUID())))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Orders every club team by its effective name and exact UUID")
  void ordersClubTeams() {
    // Given
    MatchView second =
        identities.identifyMatch(
            scope.pool(),
            "SECOND",
            new TeamCandidate(null, "Alpha", "00203", null),
            new TeamCandidate(null, "Other", "00207", null));
    sql.update("UPDATE sporting_team SET manual_name='Aardvark' WHERE id=?", match.homeTeamId());

    // When
    ConsultationViews.ClubTeams result =
        resources.clubTeams(new ClubSeasonRequest(club, scope.season()));

    // Then
    assertThat(result.items())
        .extracting(value -> value.team().id())
        .containsExactly(match.homeTeamId(), second.homeTeamId());
    assertThat(result.items().getFirst().team().name()).isEqualTo("Aardvark");
  }

  @Test
  @DisplayName("Keeps a professional clubless team and all visible participations")
  void keepsClublessTeam() {
    // Given
    UUID first = pool(scope.season(), CollectionProviderEnum.LNV, "PRO1");
    UUID second = pool(scope.season(), CollectionProviderEnum.LNV, "PRO2");
    TeamCandidate home = new TeamCandidate("PRO-HOME", "Professional", null, null);
    TeamCandidate away = new TeamCandidate("PRO-AWAY", "Professional away", null, null);
    MatchView professional = identities.identifyMatch(first, "PRO1", home, away);
    identities.identifyMatch(second, "PRO2", home, away);

    // When
    ConsultationViews.TeamDetail result = resources.team(professional.homeTeamId());

    // Then
    assertThat(result.team().professional()).isTrue();
    assertThat(result.team().club()).isNull();
    assertThat(result.participations())
        .extracting(value -> value.pool().id())
        .containsExactlyElementsOf(
            List.of(first, second).stream()
                .sorted(java.util.Comparator.comparing(UUID::toString))
                .toList());
  }

  @Test
  @DisplayName("Preserves independent schedule result and set freshness on partial match detail")
  void preservesPartialMatch() {
    // Given
    sql.update(
        "UPDATE sporting_match SET result_state='PROVISIONAL',home_sets=1,away_sets=0,result_observed_at='2026-10-21T12:00:00Z',sets_available=TRUE,sets_observed_at='2026-10-22T12:00:00Z',venue_name='Synthetic venue',referees_available=TRUE WHERE id=?",
        match.id());
    sql.update(
        "INSERT INTO sporting_match_set(match_id,set_index,home,away) VALUES (?,0,25,20)",
        match.id());

    // When
    ConsultationViews.MatchDetail result = resources.match(match.id());

    // Then
    assertThat(result.match().home().id()).isEqualTo(match.homeTeamId());
    assertThat(result.match().pool().pool().id()).isEqualTo(scope.pool());
    assertThat(result.match().schedule().observedAt().toInstant())
        .hasToString("2026-10-20T12:00:00Z");
    assertThat(result.match().result().observedAt().toInstant())
        .hasToString("2026-10-21T12:00:00Z");
    assertThat(result.sets().observedAt().toInstant()).hasToString("2026-10-22T12:00:00Z");
    assertThat(result.referees()).isEmpty();
    assertThat(result.venueAddress()).isNull();
    assertThat(result.documents()).isEmpty();
    assertThat(result.stream()).isNull();
  }

  @ParameterizedTest
  @ValueSource(strings = {"local_date=NULL", "present=FALSE"})
  @DisplayName("Hides retained final results after date or whole-match withdrawal")
  void hidesWithdrawnMatch(String withdrawal) {
    // Given
    sql.update(
        "UPDATE sporting_match SET result_state='FINAL',home_sets=3,away_sets=0,"
            + withdrawal
            + " WHERE id=?",
        match.id());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read = () -> resources.match(match.id());

    // Then
    assertThatThrownBy(read).isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Applies current parent restrictions to every affected resource")
  void hidesRestrictedParent() {
    // Given
    sql.update("UPDATE sporting_pool SET catalog_eligible=FALSE WHERE id=?", scope.pool());

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read = () -> resources.match(match.id());

    // Then
    assertThatThrownBy(read).isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(() -> resources.team(match.homeTeamId()))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(() -> resources.pool(scope.pool()))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Selects effective or automatic team artwork under current visibility")
  void selectsCurrentLogos() throws Exception {
    // Given
    byte[] clubImage = SportingImageFixture.image("PNG", 0x112233);
    byte[] manualImage = SportingImageFixture.image("JPEG", 0x334455);
    sql.update(
        "UPDATE sporting_club SET logo=?,logo_media_type='image/png' WHERE id=?", clubImage, club);
    sql.update(
        "UPDATE sporting_team SET logo=?,logo_media_type='image/jpeg' WHERE id=?",
        manualImage,
        match.homeTeamId());

    // When
    byte[] effective =
        resources.teamLogo(match.homeTeamId(), TeamLogoSelectionEnum.EFFECTIVE).bytes();
    byte[] automatic =
        resources.teamLogo(match.homeTeamId(), TeamLogoSelectionEnum.AUTOMATIC).bytes();

    // Then
    assertThat(effective).isEqualTo(manualImage);
    assertThat(automatic).isEqualTo(clubImage);
    sql.update(
        "UPDATE sporting_division SET active=FALSE WHERE id=?", SportingIngestionFixture.DIVISION);
    assertThatThrownBy(
            () -> resources.teamLogo(match.homeTeamId(), TeamLogoSelectionEnum.AUTOMATIC))
        .isInstanceOf(SportingResourceNotFoundException.class);
    assertThatThrownBy(() -> resources.divisionLogo(SportingIngestionFixture.DIVISION))
        .isInstanceOf(SportingResourceNotFoundException.class);
  }

  /**
   * Establishes another real F02 pool without inventing classification or participation rules.
   *
   * @param season exact canonical season
   * @param provider designated sporting authority
   * @param reference unique synthetic pool reference
   * @return established pool identity
   */
  private UUID pool(UUID season, CollectionProviderEnum provider, String reference) {
    return identities
        .establishPool(
            new PoolKey(provider, season, "SYNTHETIC", "COMP", null, null, reference),
            "PACK",
            reference,
            new SportingClassification(
                SportingIngestionFixture.DIVISION, SportFormatEnum._6X6, SportGenderEnum.MALE))
        .id();
  }
}
