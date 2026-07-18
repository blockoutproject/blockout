package com.blockout.search.club.outbound;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.club.application.ClubSearchStore;
import com.blockout.search.club.application.ClubSearchView;
import com.blockout.search.shared.application.SearchQuery;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Executes club searches and maps adapter-local documents in Elasticsearch hit order. */
@Component
@RequiredArgsConstructor
public class ElasticsearchClubSearchStore implements ClubSearchStore {

    private final ElasticsearchClient client;
    private final ElasticsearchClubSearchRequestFactory requests;
    private final ClubSearchDocumentMapper mapper;

    @Override
    public List<ClubSearchView> search(SearchQuery query) throws Exception {
        SearchResponse<ClubSearchDocument> response = client.search(requests.create(query), ClubSearchDocument.class);
        return views(response);
    }

    List<ClubSearchView> views(SearchResponse<ClubSearchDocument> response) {
        return response.hits().hits().stream().map(hit -> mapper.toView(hit.source())).toList();
    }
}
