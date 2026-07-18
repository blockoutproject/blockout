package com.blockout.search.team.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.shared.application.SearchQuery;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class ElasticsearchTeamSearchRequestFactoryTest {

    private final ElasticsearchTeamSearchRequestFactory requests = new ElasticsearchTeamSearchRequestFactory();

    @Test
    void preservesTheRandomBlankQueryWithoutEmptyFiltersOrAnAddedOrder() {
        SearchRequest request = requests.create(query("", " ", null, null, ""));

        assertThat(request.index()).containsExactly("teams");
        assertThat(request.size()).isEqualTo(5);
        assertThat(request.terminateAfter()).isEqualTo(1_000L);
        assertThat(request.sort()).isEmpty();
        assertThat(request.query().isFunctionScore()).isTrue();
        assertThat(request.source().filter().includes()).containsExactly(
                "id", "name", "shortName", "clubId", "clubName", "clubCity", "logoUrl",
                "divisionId", "divisionName", "format", "gender", "season");
    }

    @Test
    void preservesTheTextQueryAndAllUnnormalizedExactFilters() {
        SearchRequest request = requests.create(query(" Volley ", "2026", 42L, "6x6", "mixed"));

        assertThat(request.size()).isEqualTo(20);
        assertThat(request.terminateAfter()).isEqualTo(5_000L);
        assertThat(request.sort()).isEmpty();
        assertThat(request.query().isBool()).isTrue();
        assertThat(request.query().bool().must()).singleElement().satisfies(query -> {
            assertThat(query.isMultiMatch()).isTrue();
            assertThat(query.multiMatch().query()).isEqualTo(" Volley ");
        });
        Map<String, Query> filters = request.query().bool().filter().stream()
                .collect(Collectors.toMap(query -> query.term().field(), Function.identity()));
        assertThat(filters).containsOnlyKeys("season", "divisionId", "format", "gender");
        assertThat(filters.get("season").term().value().stringValue()).isEqualTo("2026");
        assertThat(filters.get("divisionId").term().value().longValue()).isEqualTo(42L);
        assertThat(filters.get("format").term().value().stringValue()).isEqualTo("6x6");
        assertThat(filters.get("gender").term().value().stringValue()).isEqualTo("mixed");
    }

    @Test
    void mapsTheStoreDocumentIntoAnImmutableApplicationView() {
        TeamSearchDocument document = new TeamSearchDocument(
                1L, "Team", "TM", "club-1", "Club", "Paris", "logo", 42L, "Division", "SIX", "M", "2026");

        assertThat(Mappers.getMapper(TeamSearchDocumentMapper.class).toView(document))
                .extracting(
                        "id", "name", "shortName", "clubId", "clubName", "clubCity", "logoUrl",
                        "divisionName", "format", "gender", "season")
                .containsExactly(
                        1L, "Team", "TM", "club-1", "Club", "Paris", "logo", "Division", "SIX", "M", "2026");
    }

    private FilteredSearchQuery query(
            String text, String season, Long divisionId, String format, String gender) {
        return new FilteredSearchQuery(
                new SearchQuery(text),
                new SearchFilters(season, divisionId, format, gender));
    }
}
