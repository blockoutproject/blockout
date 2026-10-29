package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Migrated PostgreSQL reads with synthetic original owners and rollback-isolated sporting data. */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Import(PostgresTestConfiguration.class)
@Transactional
@DisplayName("Current followed lists on PostgreSQL")
class FollowListsIntegrationTest {
  private static final UUID ACCOUNT = id(229);
  @Autowired private JdbcTemplate sql;
  @Autowired private ReadFollowLists reads;
  @Autowired private EntityManager entities;
  @Autowired private EntityManagerFactory entityManagers;

  @Test
  @DisplayName("The selected PostgreSQL image supplies deterministic French ICU collation")
  void suppliesFrenchCollation() {
    // Given
    String collation = "fr-x-icu";

    // When
    Boolean deterministicIcu =
        sql.queryForObject(
            "SELECT collprovider = 'i' AND collisdeterministic FROM pg_collation WHERE collname = ?",
            Boolean.class,
            collation);

    // Then
    assertThat(deterministicIcu).isTrue();
  }

  @Test
  @DisplayName("Pages French team names with a UUID tie crossing the twenty-item boundary")
  void pagesCurrentTeamSummaries() {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    UUID pool = pool(id(100), context, "Participant pool");
    List<UUID> expected = new ArrayList<>();
    expected.add(team(id(101), context, pool, "Old source name"));
    sql.update("UPDATE sporting_team SET manual_name = 'Aigle' WHERE id = ?", id(101));
    for (int index = 0; index < 18; index++) {
      expected.add(team(id(110 + index), context, pool, "Bravo " + String.format("%02d", index)));
    }
    // Deliberately insert the larger UUID first; the tie must not depend on insertion order.
    team(id(151), context, pool, "Éclair");
    expected.add(team(id(150), context, pool, "Éclair"));
    expected.add(id(151));
    expected.add(team(id(160), context, pool, "Zèbre"));
    expected.forEach(target -> follow("team", target, ACCOUNT));

    // When
    ReadFollowLists.Teams first = reads.teams(ACCOUNT, null, 0);
    ReadFollowLists.Teams second = reads.teams(ACCOUNT, null, first.nextPage());

    // Then
    assertThat(first.items()).hasSize(20);
    assertThat(first.nextPage()).isEqualTo(1L);
    assertThat(second.items()).hasSize(2);
    assertThat(second.nextPage()).isNull();
    List<UUID> actual =
        new ArrayList<>(first.items().stream().map(item -> item.team().id()).toList());
    actual.addAll(second.items().stream().map(item -> item.team().id()).toList());
    assertThat(actual).containsExactlyElementsOf(expected).doesNotHaveDuplicates();
    ConsultationViews.TeamSummary current = first.items().getFirst();
    assertThat(current.team().name()).isEqualTo("Aigle");
    assertThat(current.season().id()).isEqualTo(context.season());
    assertThat(current.season().label()).isEqualTo("2026/2027");
    assertThat(current.classification().division().name()).isEqualTo("Division 2026");
    assertThat(current.professional()).isTrue();
  }

  @Test
  @DisplayName("Pages French pool names using current presentation and stable UUID ties")
  void pagesCurrentPoolSummaries() {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    List<UUID> expected = new ArrayList<>();
    expected.add(pool(id(201), context, "Old source name"));
    sql.update("UPDATE sporting_pool SET manual_name = 'Aigle' WHERE id = ?", id(201));
    for (int index = 0; index < 18; index++) {
      expected.add(pool(id(210 + index), context, "Bravo " + String.format("%02d", index)));
    }
    pool(id(251), context, "Éclair");
    expected.add(pool(id(250), context, "Éclair"));
    expected.add(id(251));
    expected.add(pool(id(260), context, "Zèbre"));
    expected.forEach(target -> follow("pool", target, ACCOUNT));

    // When
    ReadFollowLists.Pools first = reads.pools(ACCOUNT, null, 0);
    ReadFollowLists.Pools second = reads.pools(ACCOUNT, null, first.nextPage());

    // Then
    assertThat(first.items()).hasSize(20);
    assertThat(first.nextPage()).isEqualTo(1L);
    assertThat(second.items()).hasSize(2);
    assertThat(second.nextPage()).isNull();
    List<UUID> actual =
        new ArrayList<>(first.items().stream().map(item -> item.pool().id()).toList());
    actual.addAll(second.items().stream().map(item -> item.pool().id()).toList());
    assertThat(actual).containsExactlyElementsOf(expected).doesNotHaveDuplicates();
    ConsultationViews.PoolSummary current = first.items().getFirst();
    assertThat(current.pool().name()).isEqualTo("Aigle");
    assertThat(current.season().id()).isEqualTo(context.season());
    assertThat(current.classification().division().name()).isEqualTo("Division 2026");
  }

  @Test
  @DisplayName("Filters both lists by the same sporting season while retaining closed history")
  void selectsExactSeason() {
    // Given
    account(ACCOUNT);
    Context old = context(2024);
    Context current = context(2026);
    sql.update("UPDATE sporting_season SET collection_state = 'CLOSED' WHERE id = ?", old.season());
    UUID oldPool = pool(id(301), old, "Same pool");
    UUID currentPool = pool(id(302), current, "Same pool");
    UUID oldTeam = team(id(303), old, oldPool, "Same team");
    UUID currentTeam = team(id(304), current, currentPool, "Same team");
    follow("pool", oldPool, ACCOUNT);
    follow("pool", currentPool, ACCOUNT);
    follow("team", oldTeam, ACCOUNT);
    follow("team", currentTeam, ACCOUNT);

    // When
    ReadFollowLists.Teams historicalTeams = reads.teams(ACCOUNT, old.season(), 0);
    ReadFollowLists.Pools historicalPools = reads.pools(ACCOUNT, old.season(), 0);

    // Then
    assertThat(historicalTeams.items())
        .extracting(item -> item.team().id())
        .containsExactly(oldTeam);
    assertThat(historicalPools.items())
        .extracting(item -> item.pool().id())
        .containsExactly(oldPool);
    assertThat(reads.teams(ACCOUNT, null, 0).items())
        .extracting(item -> item.team().id())
        .containsExactly(oldTeam, currentTeam);
    assertThat(reads.pools(ACCOUNT, null, 0).items())
        .extracting(item -> item.pool().id())
        .containsExactly(oldPool, currentPool);
  }

  @ParameterizedTest
  @ValueSource(strings = {"catalog", "empty-calendar", "division"})
  @DisplayName("Current sporting restrictions omit targets while preserving their original follows")
  void retainsHiddenRelations(String restriction) {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    UUID pool = pool(id(401), context, "Original pool");
    UUID team = team(id(402), context, pool, "Original team");
    UUID poolFollow = follow("pool", pool, ACCOUNT);
    UUID teamFollow = follow("team", team, ACCOUNT);
    switch (restriction) {
      case "catalog" ->
          sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE WHERE id = ?", pool);
      case "empty-calendar" ->
          sql.update("UPDATE sporting_pool SET calendar_empty = TRUE WHERE id = ?", pool);
      case "division" ->
          sql.update(
              "UPDATE sporting_division SET active = FALSE WHERE id = ?", context.division());
      default -> throw new IllegalArgumentException("Unsupported fixture restriction");
    }

    // When
    ReadFollowLists.Teams hiddenTeams = reads.teams(ACCOUNT, null, 0);
    ReadFollowLists.Pools hiddenPools = reads.pools(ACCOUNT, null, 0);

    // Then
    assertThat(hiddenTeams.items()).isEmpty();
    assertThat(hiddenPools.items()).isEmpty();
    assertThat(sql.queryForObject("SELECT id FROM team_follow WHERE team_id = ?", UUID.class, team))
        .isEqualTo(teamFollow);
    assertThat(sql.queryForObject("SELECT id FROM pool_follow WHERE pool_id = ?", UUID.class, pool))
        .isEqualTo(poolFollow);
    sql.update(
        "UPDATE sporting_pool SET catalog_eligible = TRUE, calendar_empty = FALSE WHERE id = ?",
        pool);
    sql.update("UPDATE sporting_division SET active = TRUE WHERE id = ?", context.division());
    entities.clear();
    assertThat(reads.teams(ACCOUNT, null, 0).items())
        .extracting(item -> item.team().id())
        .containsExactly(team);
    assertThat(reads.pools(ACCOUNT, null, 0).items())
        .extracting(item -> item.pool().id())
        .containsExactly(pool);
  }

  @Test
  @DisplayName("A former team participation is absent even when its pool remains viewable")
  void excludesFormerParticipation() {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    UUID pool = pool(id(501), context, "Current pool");
    UUID team = team(id(502), context, pool, "Former participant");
    follow("team", team, ACCOUNT);
    sql.update("UPDATE sporting_participation SET current = FALSE WHERE team_id = ?", team);

    // When
    ReadFollowLists.Teams result = reads.teams(ACCOUNT, context.season(), 0);

    // Then
    assertThat(result.items()).isEmpty();
    assertThat(result.nextPage()).isNull();
    assertThat(
            sql.queryForObject(
                "SELECT COUNT(*) FROM team_follow WHERE team_id = ?", Long.class, team))
        .isEqualTo(1L);
  }

  @Test
  @DisplayName("Another original account's relations never enter the requested lists")
  void isolatesOriginalOwner() {
    // Given
    account(ACCOUNT);
    UUID other = id(230);
    account(other);
    Context context = context(2026);
    UUID pool = pool(id(601), context, "Other pool");
    UUID team = team(id(602), context, pool, "Other team");
    follow("pool", pool, other);
    follow("team", team, other);

    // When
    ReadFollowLists.Teams teams = reads.teams(ACCOUNT, context.season(), 0);
    ReadFollowLists.Pools pools = reads.pools(ACCOUNT, context.season(), 0);

    // Then
    assertThat(teams.items()).isEmpty();
    assertThat(pools.items()).isEmpty();
    assertThat(teams.nextPage()).isNull();
    assertThat(pools.nextPage()).isNull();
  }

  @Test
  @DisplayName("A missing original account does not read as an empty or replacement owner's list")
  void rejectsMissingOriginalAccount() {
    // Given
    UUID missing = id(999);

    // When
    ThrowingCallable teams = () -> reads.teams(missing, null, 0);
    ThrowingCallable pools = () -> reads.pools(missing, null, 0);

    // Then
    assertThatThrownBy(teams).isInstanceOf(AccountNotFoundException.class);
    assertThatThrownBy(pools).isInstanceOf(AccountNotFoundException.class);
  }

  @Test
  @DisplayName(
      "Unknown and unavailable selected seasons remain NotFound instead of successful emptiness")
  void rejectsUnavailableSeason() {
    // Given
    account(ACCOUNT);
    Context hidden = context(2026);
    UUID pool = pool(id(701), hidden, "Hidden pool");
    follow("pool", pool, ACCOUNT);
    sql.update("UPDATE sporting_pool SET calendar_empty = TRUE WHERE id = ?", pool);
    UUID unknown = id(999);

    // When
    ThrowingCallable unknownTeams = () -> reads.teams(ACCOUNT, unknown, 0);
    ThrowingCallable unknownPools = () -> reads.pools(ACCOUNT, unknown, 0);
    ThrowingCallable hiddenTeams = () -> reads.teams(ACCOUNT, hidden.season(), 0);
    ThrowingCallable hiddenPools = () -> reads.pools(ACCOUNT, hidden.season(), 0);

    // Then
    assertThatThrownBy(unknownTeams).isInstanceOf(FollowUnavailableTargetException.class);
    assertThatThrownBy(unknownPools).isInstanceOf(FollowUnavailableTargetException.class);
    assertThatThrownBy(hiddenTeams).isInstanceOf(FollowUnavailableTargetException.class);
    assertThatThrownBy(hiddenPools).isInstanceOf(FollowUnavailableTargetException.class);
  }

  @ParameterizedTest
  @ValueSource(longs = {-1, 107374183, Long.MAX_VALUE})
  @DisplayName("Rejects page arithmetic outside the native offset range")
  void rejectsUnsupportedPage(long page) {
    // Given
    account(ACCOUNT);

    // When
    ThrowingCallable teams = () -> reads.teams(ACCOUNT, null, page);
    ThrowingCallable pools = () -> reads.pools(ACCOUNT, null, page);

    // Then
    assertThatThrownBy(teams).isInstanceOf(FollowPageOutOfRangeException.class);
    assertThatThrownBy(pools).isInstanceOf(FollowPageOutOfRangeException.class);
  }

  @Test
  @DisplayName("Accepts the maximum supported page without overflowing its real database offset")
  void acceptsMaximumOffset() {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    UUID pool = pool(id(801), context, "One pool");
    UUID team = team(id(802), context, pool, "One team");
    follow("pool", pool, ACCOUNT);
    follow("team", team, ACCOUNT);

    // When
    ReadFollowLists.Teams teams = reads.teams(ACCOUNT, null, 107374182);
    ReadFollowLists.Pools pools = reads.pools(ACCOUNT, null, 107374182);

    // Then
    assertThat(teams.items()).isEmpty();
    assertThat(pools.items()).isEmpty();
    assertThat(teams.nextPage()).isNull();
    assertThat(pools.nextPage()).isNull();
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Summary reads remain bounded when a followed list grows from one to twenty items")
  void batchesCurrentSummaries(String type) {
    // Given
    account(ACCOUNT);
    Context context = context(2026);
    UUID participantPool = pool(id(901), context, "Participant pool");
    List<UUID> targets = new ArrayList<>();
    for (int index = 0; index < 20; index++) {
      targets.add(
          type.equals("team")
              ? team(id(910 + index), context, participantPool, "Team " + index)
              : pool(id(910 + index), context, "Pool " + index));
    }
    follow(type, targets.getFirst(), ACCOUNT);
    Statistics statistics = entityManagers.unwrap(SessionFactory.class).getStatistics();
    entities.clear();
    statistics.clear();
    List<UUID> single = readIds(type);
    long singleStatements = statistics.getPrepareStatementCount();
    targets.subList(1, targets.size()).forEach(target -> follow(type, target, ACCOUNT));
    entities.clear();
    statistics.clear();

    // When
    List<UUID> fullPage;
    Long nextPage;
    if (type.equals("team")) {
      ReadFollowLists.Teams result = reads.teams(ACCOUNT, null, 0);
      fullPage = result.items().stream().map(item -> item.team().id()).toList();
      nextPage = result.nextPage();
    } else {
      ReadFollowLists.Pools result = reads.pools(ACCOUNT, null, 0);
      fullPage = result.items().stream().map(item -> item.pool().id()).toList();
      nextPage = result.nextPage();
    }
    long pageStatements = statistics.getPrepareStatementCount();

    // Then
    assertThat(single).containsExactly(targets.getFirst());
    assertThat(fullPage).containsExactlyInAnyOrderElementsOf(targets);
    assertThat(nextPage).isNull();
    assertThat(pageStatements).isEqualTo(singleStatements).isLessThanOrEqualTo(12L);
  }

  /**
   * Reads only the scenario's supported list kind for a query-count comparison.
   *
   * @param type explicit team or pool fixture kind
   * @return all original IDs on the first page
   */
  private List<UUID> readIds(String type) {
    return type.equals("team")
        ? reads.teams(ACCOUNT, null, 0).items().stream().map(item -> item.team().id()).toList()
        : reads.pools(ACCOUNT, null, 0).items().stream().map(item -> item.pool().id()).toList();
  }

  /**
   * Creates a synthetic usable original account without involving provider administration.
   *
   * @param id exact original lifecycle identity
   */
  private void account(UUID id) {
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', ?, ?, ?)",
        id,
        id.toString(),
        "Owner-" + id.getLeastSignificantBits(),
        id + "@example.invalid");
  }

  /**
   * Creates only the canonical season, division and pack shared by this scenario's targets.
   *
   * @param year explicit sporting year
   * @return original persisted context
   */
  private Context context(int year) {
    Context context =
        new Context(
            fixtureId(year + "-season"), fixtureId(year + "-division"), fixtureId(year + "-pack"));
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, ?, ?)",
        context.season(),
        year,
        year + "/" + (year + 1));
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, ?, TRUE, '#112233')",
        context.division(),
        "Division " + year);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', 'pack')",
        context.pack(),
        context.season());
    return context;
  }

  /**
   * Creates a currently viewable pool with an independent original identity and exact public name.
   *
   * @param id scenario-owned pool UUID
   * @param context canonical season and classification
   * @param name exact public source name
   * @return unchanged pool identity
   */
  private UUID pool(UUID id, Context context, String name) {
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender, calendar_empty) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', ?, ?, ?, '_6X6', 'MIXED', FALSE)",
        id,
        context.season(),
        context.pack(),
        id.toString(),
        name,
        context.division());
    return id;
  }

  /**
   * Creates a classified professional team with its required current pool participation.
   *
   * @param id scenario-owned seasonal team UUID
   * @param context canonical season and classification
   * @param pool current participation owner
   * @param name exact public source name
   * @return unchanged team identity
   */
  private UUID team(UUID id, Context context, UUID pool, String name) {
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', ?, ?, ?, ?, '_6X6', 'MIXED')",
        id,
        context.season(),
        id.toString(),
        name,
        id.toString(),
        context.division());
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        fixtureId(id + "-participation"),
        id,
        pool);
    return id;
  }

  /**
   * Persists the exact account/target relation; this suite qualifies reads, not write
   * orchestration.
   *
   * @param type explicit team or pool fixture kind
   * @param target original sporting UUID
   * @param account original account UUID
   * @return original relation UUID for hidden/reappearance assertions
   */
  private UUID follow(String type, UUID target, UUID account) {
    UUID relation = fixtureId(type + "-" + target + "-" + account);
    sql.update(
        "INSERT INTO " + type + "_follow(id, account_id, " + type + "_id) VALUES (?, ?, ?)",
        relation,
        account,
        target);
    return relation;
  }

  /**
   * Creates secondary context identities without random test ordering.
   *
   * @param role synthetic fixture role
   * @return stable context UUID
   */
  private static UUID fixtureId(String role) {
    return UUID.nameUUIDFromBytes(role.getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Keeps asserted target UUID order visible in each scenario.
   *
   * @param value scenario identity suffix
   * @return canonical stable UUID whose ordering follows its suffix
   */
  private static UUID id(int value) {
    return UUID.fromString("00000000-0000-4000-8000-" + String.format("%012d", value));
  }

  /** Canonical sporting context; no duplicate public presentation or visibility rules. */
  private record Context(UUID season, UUID division, UUID pack) {}
}
