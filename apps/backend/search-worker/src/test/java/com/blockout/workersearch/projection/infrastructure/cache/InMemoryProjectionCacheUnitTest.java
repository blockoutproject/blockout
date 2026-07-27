package com.blockout.workersearch.projection.infrastructure.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("In-memory projection cache")
class InMemoryProjectionCacheUnitTest {

  private final InMemoryProjectionCache cache = new InMemoryProjectionCache();

  @Test
  @DisplayName("keeps one current team per identifier")
  void keepsOneCurrentTeamPerIdentifier() {
    cache.putTeam(team(1L, "club-1", "Original"));
    var updated = team(1L, "club-1", "Updated");

    cache.putTeam(updated);

    assertThat(cache.findTeamsByClub("club-1")).containsExactly(updated);
    assertThat(cache.teamClubCount()).isEqualTo(1);
  }

  @Test
  @DisplayName("moves an updated team between owning clubs")
  void movesAnUpdatedTeamBetweenOwningClubs() {
    cache.putTeam(team(1L, "club-1", "Team"));
    var moved = team(1L, "club-2", "Team");

    cache.putTeam(moved);

    assertThat(cache.findTeamsByClub("club-1")).isEmpty();
    assertThat(cache.findTeamsByClub("club-2")).containsExactly(moved);
    assertThat(cache.teamClubCount()).isEqualTo(1);
  }

  @Test
  @DisplayName("returns immutable team snapshots")
  void returnsImmutableTeamSnapshots() {
    var cached = team(1L, "club-1", "Cached");
    cache.putTeam(cached);
    var snapshot = cache.findTeamsByClub("club-1");

    cache.putTeam(team(2L, "club-1", "Later"));

    assertThat(snapshot).containsExactly(cached);
    assertThatThrownBy(() -> snapshot.add(team(3L, "club-1", "Rejected")))
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  @DisplayName("replaces teams idempotently")
  void replacesTeamsIdempotently() {
    var teams = List.of(team(1L, "club-1", "Team"));

    cache.replaceTeams(teams);
    cache.replaceTeams(teams);

    assertThat(cache.findTeamsByClub("club-1")).containsExactlyElementsOf(teams);
  }

  @Test
  @DisplayName("removes a team by identifier")
  void removesATeamByIdentifier() {
    cache.putTeam(team(1L, "club-1", "Removed"));
    var retained = team(2L, "club-1", "Retained");
    cache.putTeam(retained);

    cache.removeTeam(1L);

    assertThat(cache.findTeamsByClub("club-1")).containsExactly(retained);
  }

  private TeamProjectionSource team(Long id, String clubId, String name) {
    return new TeamProjectionSource(
        id, name, name, clubId, 20L, Format.SIX, Gender.F, "2026/2027", null);
  }
}
