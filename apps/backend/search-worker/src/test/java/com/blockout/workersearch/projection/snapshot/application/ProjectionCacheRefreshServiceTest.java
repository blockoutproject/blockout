package com.blockout.workersearch.projection.snapshot.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.configuration.division.application.DivisionCatalog;
import com.blockout.workersearch.configuration.division.application.DivisionSnapshot;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.application.TeamSnapshot;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProjectionCacheRefreshServiceTest {

    @Test
    void mapsCatalogSnapshotsIntoWorkerOwnedImmutableCacheSnapshots() {
        ClubSnapshot club = new ClubSnapshot("club-1", "Club", "club-logo", "Paris");
        TeamSnapshot team = new TeamSnapshot(
                1L, "Team", "TM", "club-1", 2L, FormatEnum.SIX, GenderEnum.M, "2026", "team-logo");
        DivisionSnapshot division = new DivisionSnapshot(
                2L, "Division", null, null, null, null, "division-logo", true, 6L);
        ClubCatalog clubCatalog = new FixedClubCatalog(club);
        TeamCatalog teamCatalog = new FixedTeamCatalog(team);
        DivisionCatalog divisionCatalog = new FixedDivisionCatalog(division);
        ClubProjectionCache clubCache = new ClubProjectionCache();
        TeamProjectionCache teamCache = new TeamProjectionCache();
        DivisionProjectionCache divisionCache = new DivisionProjectionCache();
        ProjectionCacheRefreshService service = new ProjectionCacheRefreshService(
                clubCatalog, teamCatalog, divisionCatalog, clubCache, teamCache, divisionCache);

        assertThat(service.refreshClubs()).isOne();
        assertThat(service.refreshTeams()).isOne();
        assertThat(service.refreshDivisions()).isOne();

        assertThat(clubCache.getById("club-1"))
                .isEqualTo(new ClubCacheSnapshot("club-1", "Club", "club-logo", "Paris"));
        assertThat(teamCache.getByClubId("club-1")).containsExactly(new TeamCacheSnapshot(
                1L, "Team", "TM", "club-1", 2L, FormatEnum.SIX, GenderEnum.M, "2026", "team-logo"));
        assertThat(divisionCache.getById(2L))
                .isEqualTo(new DivisionCacheSnapshot(2L, "Division", "division-logo", 6L));
    }

    private record FixedClubCatalog(ClubSnapshot club) implements ClubCatalog {
        @Override
        public List<ClubSnapshot> findActiveClubs() {
            return List.of(club);
        }

        @Override
        public ClubSnapshot getById(String id) {
            return club;
        }
    }

    private record FixedTeamCatalog(TeamSnapshot team) implements TeamCatalog {
        @Override
        public List<TeamSnapshot> findActiveTeams() {
            return List.of(team);
        }

        @Override
        public List<TeamSnapshot> findByClubId(String clubId) {
            return List.of(team);
        }
    }

    private record FixedDivisionCatalog(DivisionSnapshot division) implements DivisionCatalog {
        @Override
        public List<DivisionSnapshot> findAll() {
            return List.of(division);
        }

        @Override
        public DivisionSnapshot getById(Long id) {
            return division;
        }
    }
}
