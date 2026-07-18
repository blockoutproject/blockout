package com.blockout.search.club.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import com.blockout.search.shared.application.SearchQuery;
import java.util.List;
import org.junit.jupiter.api.Test;

class ElasticsearchClubSearchRequestFactoryTest {

    private final ElasticsearchClubSearchRequestFactory requests = new ElasticsearchClubSearchRequestFactory();

    @Test
    void preservesTheRandomBlankQueryWithoutAddingAnOrder() {
        SearchRequest request = requests.create(new SearchQuery("  "));

        assertThat(request.index()).containsExactly("clubs");
        assertThat(request.size()).isEqualTo(5);
        assertThat(request.terminateAfter()).isEqualTo(1_000L);
        assertThat(request.timeout()).isEqualTo("150ms");
        assertThat(request.trackTotalHits().enabled()).isFalse();
        assertThat(request.sort()).isEmpty();
        assertThat(request.query().isFunctionScore()).isTrue();
        assertThat(request.query().functionScore().query().isMatchAll()).isTrue();
        assertThat(request.query().functionScore().functions()).hasSize(1);
        assertThat(request.source().filter().includes()).containsExactly("id", "name", "city", "logoUrl");
    }

    @Test
    void preservesTheBoostedNonBlankQueryWithoutNormalizingText() {
        SearchRequest request = requests.create(new SearchQuery(" Volley "));

        assertThat(request.size()).isEqualTo(20);
        assertThat(request.terminateAfter()).isEqualTo(5_000L);
        assertThat(request.sort()).isEmpty();
        assertThat(request.query().isMultiMatch()).isTrue();
        assertThat(request.query().multiMatch().query()).isEqualTo(" Volley ");
        assertThat(request.query().multiMatch().type()).isEqualTo(TextQueryType.BoolPrefix);
        assertThat(request.query().multiMatch().operator()).isEqualTo(Operator.And);
        assertThat(request.query().multiMatch().fields()).containsExactlyElementsOf(List.of(
                "name^4", "name._2gram^4", "name._3gram^4",
                "city^2", "city._2gram^2", "city._3gram^2", "all"));
    }
}
