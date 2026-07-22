package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.search.infrastructure.contract.models.ClubSearchInternalResponse;
import com.blockout.mobilegateway.search.infrastructure.contract.models.PoolSearchInternalResponse;
import com.blockout.mobilegateway.search.infrastructure.contract.models.TeamSearchInternalResponse;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchContractMapperUnitTest {

    private final SearchContractMapper mapper = new SearchContractMapper();

    @Test
    void mapsGeneratedSearchModelsToTheExistingPublicShapes() {
        var club = new ClubSearchInternalResponse("club-1", "Club").city("Paris").logoUrl("club.png");
        var team = new TeamSearchInternalResponse(1L, "Team", "club-1", FormatEnum.SIX, GenderEnum.F, "2026/2027")
            .shortName("T")
            .clubName("Club")
            .clubCity("Paris")
            .divisionName("National")
            .logoUrl("team.png");
        var pool = new PoolSearchInternalResponse(2L, "Pool", "2026/2027", FormatEnum.SIX, GenderEnum.F)
            .shortName("P")
            .divisionName("National")
            .leagueCode("LNV")
            .leagueName("League")
            .logoUrl("pool.png");

        assertThat(mapper.toResponse(club).city()).isEqualTo("Paris");
        assertThat(mapper.toResponse(team).format()).isEqualTo("SIX");
        assertThat(mapper.toResponse(pool).leagueCode()).isEqualTo("LNV");
    }
}
