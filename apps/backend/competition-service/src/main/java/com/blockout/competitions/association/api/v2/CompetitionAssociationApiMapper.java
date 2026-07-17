package com.blockout.competitions.association.api.v2;

import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.association.application.CompetitionStatisticsSnapshot;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalResponse;
import com.blockout.competitions.generated.model.CompetitionStatisticsSnapshotInternalRequest;
import com.blockout.competitions.shared.mapping.CompetitionMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CompetitionMapperConfig.class)
public interface CompetitionAssociationApiMapper {

    CompetitionAssociationInternalResponse toResponse(CompetitionAssociationView view);

    CompetitionStatisticsSnapshot toSnapshot(CompetitionStatisticsSnapshotInternalRequest request);
}
