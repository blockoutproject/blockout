package com.blockout.workersearch.team.outbound;

import com.blockout.workersearch.shared.mapping.SearchWorkerMapperConfig;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.teamsclient.model.TeamInternalResponse;
import org.mapstruct.Mapper;

@Mapper(config = SearchWorkerMapperConfig.class)
public interface TeamSnapshotMapper {

    TeamSnapshot toSnapshot(TeamInternalResponse response);
}
