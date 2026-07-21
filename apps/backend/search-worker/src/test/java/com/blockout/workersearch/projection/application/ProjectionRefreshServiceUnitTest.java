package com.blockout.workersearch.projection.application;

import com.blockout.workersearch.projection.application.models.*;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectionRefreshServiceUnitTest {

    @Mock
    private ProjectionSource projectionSource;

    @Mock
    private ProjectionCache projectionCache;

    @Mock
    private SearchProjectionService searchProjectionService;

    private ProjectionRefreshService service;

    @BeforeEach
    void setUp() {
        service = new ProjectionRefreshService(projectionSource, projectionCache, searchProjectionService);
    }

    @Test
    void initializesTheThreeCachesFromTheirAuthoritativeInternalApis() {
        var clubs = List.of(new ClubProjectionSource("club-1", "Club", null, "Paris"));
        var teams = List.of(new TeamProjectionSource(
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
    void rebuildsClubTeamAndPoolIndexesInTheExistingOrder() {
        var clubs = List.of(new ClubProjectionSource("club-1", "Club", null, "Paris"));
        var teams = List.of(new TeamProjectionSource(
            1L, "Team", "T", "club-1", 2L, Format.SIX, Gender.F, "2026/2027", null));
        var pools = List.of(new PoolProjectionSource(
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
}
