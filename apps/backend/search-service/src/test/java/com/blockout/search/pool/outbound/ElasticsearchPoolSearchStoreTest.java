package com.blockout.search.pool.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch.core.SearchRequest;
import com.blockout.search.shared.application.SearchFilters;
import org.junit.jupiter.api.Test;

class ElasticsearchPoolSearchStoreTest {

    private final ElasticsearchPoolSearchStore store = new ElasticsearchPoolSearchStore(null, null);

    @Test
    void preservesThePoolProjectionAndFilteredQueryShape() {
        SearchRequest request = store.request(new SearchFilters("Volley", "2026", 42L, "6x6", "mixed"));

        assertThat(request.index()).containsExactly("pools");
        assertThat(request.size()).isEqualTo(20);
        assertThat(request.terminateAfter()).isEqualTo(5_000L);
        assertThat(request.query().isBool()).isTrue();
        assertThat(request.query().bool().must()).singleElement().satisfies(query -> {
            assertThat(query.isMultiMatch()).isTrue();
            assertThat(query.multiMatch().fields()).contains(
                    "shortName^4", "name^3", "divisionName^2", "leagueName^2", "all");
        });
        assertThat(request.query().bool().filter()).hasSize(4);
        assertThat(request.source().filter().includes()).containsExactly(
                "id", "name", "shortName", "divisionId", "divisionName", "leagueCode", "leagueName",
                "season", "gender", "logoUrl", "format");
    }
}
