package com.blockout.pools.pool.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.pools.generated.api.PoolFollowersApi;
import com.blockout.pools.generated.api.PoolsApi;
import com.blockout.pools.generated.model.PoolInternalResponse;
import com.blockout.pools.pool.api.v2.PoolApiMapper;
import com.blockout.pools.pool.api.v2.PoolFollowersV2Controller;
import com.blockout.pools.pool.api.v2.PoolV2Controller;
import com.blockout.pools.pool.application.PoolView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class PoolV2BoundaryTest {

    @Test
    void controllersImplementEveryGeneratedPoolBoundary() {
        assertThat(PoolsApi.class).isAssignableFrom(PoolV2Controller.class);
        assertThat(PoolFollowersApi.class).isAssignableFrom(PoolFollowersV2Controller.class);
    }

    @Test
    void generatedResponseUsesCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        PoolApiMapper mapper = Mappers.getMapper(PoolApiMapper.class);
        PoolInternalResponse response = mapper.toResponse(new PoolView(
                1L, "P1", "L1", "2026", "League", "Raw", "Pool", "PL", 2L,
                FormatEnum.SIX, GenderEnum.M, 3L, true, 7L, LocalDateTime.now(), LocalDateTime.now()));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains(
                "\"poolCode\"", "\"leagueCode\"", "\"shortName\"", "\"followersCount\"", "\"revision\":7");
        assertThat(body).doesNotContain("pool_code", "league_code", "short_name", "followers_count");
    }
}
