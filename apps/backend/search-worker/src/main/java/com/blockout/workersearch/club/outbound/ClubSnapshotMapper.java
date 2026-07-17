package com.blockout.workersearch.club.outbound;

import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.clubsclient.model.ClubInternalResponse;
import com.blockout.workersearch.shared.mapping.SearchWorkerMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchWorkerMapperConfig.class)
public interface ClubSnapshotMapper {

    ClubSnapshot toSnapshot(ClubInternalResponse response);
}
