package com.blockout.workersearch.projection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;
import com.blockout.workersearch.projection.application.models.PoolProjectionSource;
import com.blockout.workersearch.projection.application.models.PoolSearchProjection;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamSearchProjection;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionIndex;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SearchProjectionServiceUnitTest {

    @Mock
    private ProjectionIndex projectionIndex;

    @Mock
    private ProjectionCache projectionCache;

    private SearchProjectionService service;

    @BeforeEach
    void setUp() {
        service = new SearchProjectionService(projectionIndex, projectionCache);
    }

    @Test
    void enrichesATeamFromClubAndDivisionCaches() {
        var team = new TeamProjectionSource(
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
    void keepsTheExistingUnknownDivisionFallbackForPools() {
        var pool = new PoolProjectionSource(
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
    void refreshesCachedTeamsAfterAClubUpsert() {
        var club = new ClubProjectionSource("club-1", "Club", "club.png", "Paris");
        var team = new TeamProjectionSource(
                10L, "Team", "T", "club-1", 20L, Format.SIX, Gender.F, "2026/2027", null);
        when(projectionCache.findTeamsByClub("club-1")).thenReturn(List.of(team));

        service.upsertClubs(List.of(club));

        verify(projectionIndex).saveClubs(anyList());
        verify(projectionCache).putClub(club);
        verify(projectionIndex).saveTeams(anyList());
    }

    @Test
    void removesOnlyTheExistingClubAndItsCachedTeamsOnDeactivation() {
        service.deactivateClub("club-1");

        verify(projectionIndex).deleteClub("club-1");
        verify(projectionCache).removeClub("club-1");
        verify(projectionCache).removeTeamsForClub("club-1");
        verify(projectionIndex, never()).deleteAllClubs();
    }
}
