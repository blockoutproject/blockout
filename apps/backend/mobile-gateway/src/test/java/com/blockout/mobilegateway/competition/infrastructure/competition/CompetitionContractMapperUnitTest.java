package com.blockout.mobilegateway.competition.infrastructure.competition;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompetitionContractMapperUnitTest {
    private final CompetitionContractMapper mapper = new CompetitionContractMapper();

    @Test
    void mapsGeneratedAssociationToGatewayModel() {
        var contract = new com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse()
            .id(1L).poolId(2L).teamId(3L).clubId("club-1").active(true).points(9);

        var result = mapper.toView(contract);

        assertThat(result.teamId()).isEqualTo(3L);
        assertThat(result.points()).isEqualTo(9);
    }

    @Test
    void mapsGeneratedRankingToGatewayModel() {
        var ranking = new com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.TeamRankingInternalResponse()
            .teamId(3L).points(9).played(3).wins(3).losses(0).pointsPenalty(0)
            .coefSets(3.0).coefPoints(1.2);
        var contract = new com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.PoolWithRankingInternalResponse()
            .poolId(2L).ranking(List.of(ranking));

        var result = mapper.toView(contract);

        assertThat(result.poolId()).isEqualTo(2L);
        assertThat(result.ranking()).singleElement().satisfies(item -> {
            assertThat(item.teamId()).isEqualTo(3L);
            assertThat(item.points()).isEqualTo(9);
        });
    }
}
