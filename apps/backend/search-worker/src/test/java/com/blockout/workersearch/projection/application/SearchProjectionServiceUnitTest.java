package com.blockout.workersearch.projection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.blockout.workersearch.projection.application.models.*;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionIndex;
import com.blockout.workersearch.projection.infrastructure.cache.InMemoryProjectionCache;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Search projection service")
class SearchProjectionServiceUnitTest {

  @Mock private ProjectionIndex projectionIndex;

  @Mock private ProjectionCache projectionCache;

  private SearchProjectionService service;

  @BeforeEach
  void setUp() {
    service = new SearchProjectionService(projectionIndex, projectionCache);
  }

  @Test
  @DisplayName("enriches a team from club and division caches")
  void enrichesATeamFromClubAndDivisionCaches() {
    var team =
        new TeamProjectionSource(
            10L, "Team", "T", "club-1", 20L, Format.SIX, Gender.F, "2026/2027", "");
    when(projectionCache.findClub("club-1"))
        .thenReturn(new ClubProjectionSource("club-1", "Club", "club.png", "Paris"));
    when(projectionCache.findDivision(20L))
        .thenReturn(new DivisionProjectionSource(20L, "National 1", "division.png"));

    service.upsertTeams(List.of(team));

    ArgumentCaptor<List<TeamSearchProjection>> projections = ArgumentCaptor.captor();
    verify(projectionIndex).saveTeams(projections.capture());
    var projection = projections.getValue().getFirst();
    assertThat(projection.clubName()).isEqualTo("Club");
    assertThat(projection.clubCity()).isEqualTo("Paris");
    assertThat(projection.logoUrl()).isEqualTo("club.png");
    assertThat(projection.divisionName()).isEqualTo("National 1");
    assertThat(projection.format()).isEqualTo("SIX");
    verify(projectionCache).putTeam(team);
  }

  @Test
  @DisplayName("keeps the existing unknown division fallback for pools")
  void keepsTheExistingUnknownDivisionFallbackForPools() {
    var pool =
        new PoolProjectionSource(
            1L, "Pool", "P", 99L, "LNV", "League", "2026/2027", Format.SIX, Gender.M);

    service.upsertPools(List.of(pool));

    ArgumentCaptor<List<PoolSearchProjection>> projections = ArgumentCaptor.captor();
    verify(projectionIndex).savePools(projections.capture());
    var projection = projections.getValue().getFirst();
    assertThat(projection.divisionId()).isNull();
    assertThat(projection.divisionName()).isEqualTo("Division inconnue");
    assertThat(projection.logoUrl()).isNull();
  }

  @Test
  @DisplayName("reprojects cached teams after a club upsert")
  void reprojectsCachedTeamsAfterAClubUpsert() {
    var club = new ClubProjectionSource("club-1", "Club", "club.png", "Paris");
    var team =
        new TeamProjectionSource(
            10L, "Team", "T", "club-1", 20L, Format.SIX, Gender.F, "2026/2027", null);
    var realCache = new InMemoryProjectionCache();
    realCache.putTeam(team);
    var realCacheService = new SearchProjectionService(projectionIndex, realCache);

    realCacheService.upsertClubs(List.of(club));

    verify(projectionIndex).saveClubs(anyList());
    ArgumentCaptor<List<TeamSearchProjection>> projections = ArgumentCaptor.captor();
    verify(projectionIndex).saveTeams(projections.capture());
    assertThat(projections.getValue()).hasSize(1);
    assertThat(realCache.findTeamsByClub("club-1")).containsExactly(team);
  }

  @Test
  @DisplayName("removes only the existing club and its cached teams on deactivation")
  void removesOnlyTheExistingClubAndItsCachedTeamsOnDeactivation() {
    service.deactivateClub("club-1");

    verify(projectionIndex).deleteClub("club-1");
    verify(projectionCache).removeClub("club-1");
    verify(projectionCache).removeTeamsForClub("club-1");
    verify(projectionIndex, never()).deleteAllClubs();
  }

  @Test
  @DisplayName("removes a deactivated team from the index and cache")
  void removesADeactivatedTeamFromTheIndexAndCache() {
    service.deactivateTeam(10L);

    verify(projectionIndex).deleteTeam(10L);
    verify(projectionCache).removeTeam(10L);
  }
}
