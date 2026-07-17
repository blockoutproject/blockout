package com.blockout.competitions.ranking.api.v2;

import com.blockout.competitions.generated.model.PoolRankingInternalResponse;
import com.blockout.competitions.generated.model.TeamRankingInternalResponse;
import com.blockout.competitions.ranking.application.PoolRankingView;
import com.blockout.competitions.ranking.application.TeamRankingView;
import com.blockout.competitions.shared.mapping.CompetitionMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CompetitionMapperConfig.class)
public interface CompetitionRankingApiMapper {

    PoolRankingInternalResponse toResponse(PoolRankingView view);

    TeamRankingInternalResponse toResponse(TeamRankingView view);
}
