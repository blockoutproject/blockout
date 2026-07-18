package com.blockout.search.club.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class ElasticsearchClubSearchStoreTest {

    @Test
    void mapsHitsOneForOneWithoutChangingElasticsearchOrder() {
        ClubSearchDocument second = new ClubSearchDocument("club-2", "Second", "logo-2", "Paris");
        ClubSearchDocument first = new ClubSearchDocument("club-1", "First", "logo-1", "Lyon");
        SearchResponse<ClubSearchDocument> response = SearchResponse.of(search -> search
                .took(1)
                .timedOut(false)
                .shards(shards -> shards.total(1).successful(1).failed(0))
                .hits(hits -> hits.hits(List.of(
                        Hit.of(hit -> hit.index("clubs").id("club-2").source(second)),
                        Hit.of(hit -> hit.index("clubs").id("club-1").source(first))))));
        ElasticsearchClubSearchStore store = new ElasticsearchClubSearchStore(
                null,
                null,
                Mappers.getMapper(ClubSearchDocumentMapper.class));

        assertThat(store.views(response))
                .extracting("id")
                .containsExactly("club-2", "club-1");
    }
}
