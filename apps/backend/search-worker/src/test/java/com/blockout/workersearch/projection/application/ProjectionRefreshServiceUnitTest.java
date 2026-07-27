package com.blockout.workersearch.projection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.blockout.workersearch.projection.application.models.*;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionIndex;
import com.blockout.workersearch.projection.application.ports.ProjectionSource;
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
@DisplayName("Projection refresh service")
class ProjectionRefreshServiceUnitTest {

  @Mock private ProjectionSource projectionSource;

  @Mock private ProjectionCache projectionCache;

  @Mock private SearchProjectionService searchProjectionService;

  private ProjectionRefreshService service;

  @BeforeEach
  void setUp() {
    service =
        new ProjectionRefreshService(projectionSource, projectionCache, searchProjectionService);
  }

  @Test
  @DisplayName("initializes the three caches from their authoritative internal APIs")
  void initializesTheThreeCachesFromTheirAuthoritativeInternalApis() {
    var clubs = List.of(new ClubProjectionSource("club-1", "Club", null, "Paris"));
    var teams =
        List.of(
            new TeamProjectionSource(
                1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null));
    var divisions = List.of(new DivisionProjectionSource(2L, "Division", null));
    when(projectionSource.listActiveClubs()).thenReturn(clubs);
    when(projectionSource.listActiveTeams()).thenReturn(teams);
    when(projectionSource.listDivisions()).thenReturn(divisions);

    service.initializeCaches();

    verify(projectionCache).replaceClubs(clubs);
    verify(projectionCache).replaceTeams(teams);
    verify(projectionCache).replaceDivisions(divisions);
  }

  @Test
  @DisplayName("rebuilds club, team, and pool indexes in the existing order")
  void rebuildsClubTeamAndPoolIndexesInTheExistingOrder() {
    var clubs = List.of(new ClubProjectionSource("club-1", "Club", null, "Paris"));
    var teams =
        List.of(
            new TeamProjectionSource(
                1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null));
    var pools =
        List.of(
            new PoolProjectionSource(
                3L, "Pool", "P", 2L, "LNV", "League", "2026/2027", Format.SIX, Gender.F));
    when(projectionSource.listActiveClubs()).thenReturn(clubs);
    when(projectionSource.listActiveTeams()).thenReturn(teams);
    when(projectionSource.listActivePools()).thenReturn(pools);

    service.rebuildAll();

    var order = inOrder(searchProjectionService);
    order.verify(searchProjectionService).rebuildClubs(clubs);
    order.verify(searchProjectionService).rebuildTeams(teams);
    order.verify(searchProjectionService).rebuildPools(pools);
  }

  @Test
  @DisplayName("initializes the real cache idempotently")
  void initializesTheRealCacheIdempotently() {
    var realCache = new InMemoryProjectionCache();
    var realService =
        new ProjectionRefreshService(projectionSource, realCache, searchProjectionService);
    var team =
        new TeamProjectionSource(
            1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null);
    when(projectionSource.listActiveClubs()).thenReturn(List.of());
    when(projectionSource.listActiveTeams()).thenReturn(List.of(team));
    when(projectionSource.listDivisions()).thenReturn(List.of());

    realService.initializeCaches();
    realService.initializeCaches();

    assertThat(realCache.findTeamsByClub("club-1")).containsExactly(team);
  }

  @Test
  @DisplayName("rebuilds the full index idempotently with the real cache")
  void rebuildsTheFullIndexIdempotentlyWithTheRealCache() {
    var realCache = new InMemoryProjectionCache();
    ProjectionIndex projectionIndex = mock(ProjectionIndex.class);
    var realSearchService = new SearchProjectionService(projectionIndex, realCache);
    var realService = new ProjectionRefreshService(projectionSource, realCache, realSearchService);
    var club = new ClubProjectionSource("club-1", "Club", null, "Paris");
    var team =
        new TeamProjectionSource(
            1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null);
    when(projectionSource.listActiveClubs()).thenReturn(List.of(club));
    when(projectionSource.listActiveTeams()).thenReturn(List.of(team));
    when(projectionSource.listActivePools()).thenReturn(List.of());
    when(projectionSource.listDivisions()).thenReturn(List.of());
    realService.initializeCaches();

    realService.rebuildAll();
    realService.rebuildAll();

    assertThat(realCache.findTeamsByClub("club-1")).containsExactly(team);
    ArgumentCaptor<List<TeamSearchProjection>> projections = ArgumentCaptor.captor();
    verify(projectionIndex, times(4)).saveTeams(projections.capture());
    assertThat(projections.getAllValues()).allSatisfy(batch -> assertThat(batch).hasSize(1));
    verify(projectionIndex, times(2)).deleteAllTeams();
  }
}
