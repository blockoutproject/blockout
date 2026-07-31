package com.blockout.pools.pool.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.pools.pool.api.models.PoolInternalResponse;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Protects the generated Pool transport shape. */
@DisplayName("Pool API contract")
class PoolApiContractUnitTest {
  @Test
  @DisplayName("exposes the complete Pool shape in native camelCase")
  void exposesTheCompletePoolShape() {
    PoolInternalResponse response =
        new PoolInternalResponse()
            .id(1L)
            .poolCode("A")
            .leagueCode("LNV")
            .season("2026/2027")
            .leagueName("League")
            .rawName("RAW")
            .name("Pool")
            .shortName("P")
            .divisionId(2L)
            .format(FormatEnum.SIX)
            .gender(GenderEnum.F)
            .followersCount(3L)
            .active(true);
    JsonNode json = JsonMapper.builder().build().valueToTree(response);
    assertThat(json.propertyNames())
        .containsExactlyInAnyOrderElementsOf(
            Set.of(
                "id",
                "poolCode",
                "leagueCode",
                "season",
                "leagueName",
                "rawName",
                "name",
                "shortName",
                "divisionId",
                "format",
                "gender",
                "followersCount",
                "active",
                "createdAt",
                "lastUpdate"));
    assertThat(json.has("pool_code")).isFalse();
  }

  @Test
  @DisplayName("controller implements the generated Pool API")
  void controllerImplementsGeneratedApi() {
    assertThat(PoolApi.class).isAssignableFrom(PoolController.class);
  }
}
