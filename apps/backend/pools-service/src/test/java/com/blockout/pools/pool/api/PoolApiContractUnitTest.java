package com.blockout.pools.pool.api;

import com.blockout.pools.pool.api.models.PoolInternalResponse;
import com.blockout.pools.pool.application.models.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;

/** Protects the complete handwritten Pool transport shape. */
@DisplayName("Pool API contract")
class PoolApiContractUnitTest {
    @Test @DisplayName("exposes the complete Pool shape in native camelCase")
    void exposesTheCompletePoolShape() {
        PoolInternalResponse response = new PoolInternalResponse(1L, "A", "LNV", "2026/2027", "League", "RAW",
                "Pool", "P", 2L, Format.SIX, Gender.F, 3L, true, null, null);
        JsonNode json = new ObjectMapper().valueToTree(response);
        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrderElementsOf(Set.of(
                "id", "poolCode", "leagueCode", "season", "leagueName", "rawName", "name", "shortName",
                "divisionId", "format", "gender", "followersCount", "active", "createdAt", "lastUpdate"));
        assertThat(json.has("pool_code")).isFalse();
    }
}
