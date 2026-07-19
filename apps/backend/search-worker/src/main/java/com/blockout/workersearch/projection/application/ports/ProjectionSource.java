package com.blockout.workersearch.projection.application.ports;

import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.PoolProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import java.util.List;

public interface ProjectionSource {
    List<ClubProjectionSource> listActiveClubs();

    List<TeamProjectionSource> listActiveTeams();

    List<PoolProjectionSource> listActivePools();

    List<DivisionProjectionSource> listDivisions();
}
