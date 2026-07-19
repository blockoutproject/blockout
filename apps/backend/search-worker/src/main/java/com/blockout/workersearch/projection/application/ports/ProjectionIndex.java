package com.blockout.workersearch.projection.application.ports;

import com.blockout.workersearch.projection.application.models.ClubSearchProjection;
import com.blockout.workersearch.projection.application.models.PoolSearchProjection;
import com.blockout.workersearch.projection.application.models.TeamSearchProjection;
import java.util.List;

public interface ProjectionIndex {
    void saveClubs(List<ClubSearchProjection> clubs);

    void saveTeams(List<TeamSearchProjection> teams);

    void savePools(List<PoolSearchProjection> pools);

    void deleteClub(String id);

    void deleteTeam(Long id);

    void deletePool(Long id);

    void deleteAllClubs();

    void deleteAllTeams();

    void deleteAllPools();
}
