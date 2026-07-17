package com.blockout.workersearch.configuration.division.outbound;

import com.blockout.workersearch.configclient.model.DivisionInternalResponse;
import com.blockout.workersearch.configuration.division.application.DivisionSnapshot;
import com.blockout.workersearch.shared.mapping.SearchWorkerMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchWorkerMapperConfig.class)
public interface ConfigDivisionMapper {

    DivisionSnapshot toSnapshot(DivisionInternalResponse response);
}
