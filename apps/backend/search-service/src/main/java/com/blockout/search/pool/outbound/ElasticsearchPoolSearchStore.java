package com.blockout.search.pool.outbound;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.pool.application.PoolSearchStore;
import com.blockout.search.pool.application.PoolSearchView;
import com.blockout.search.shared.application.FilteredSearchQuery;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Executes pool searches and maps adapter-local documents in Elasticsearch hit order. */
@Component
@RequiredArgsConstructor
public class ElasticsearchPoolSearchStore implements PoolSearchStore {

    private final ElasticsearchClient client;
    private final ElasticsearchPoolSearchRequestFactory requests;
    private final PoolSearchDocumentMapper mapper;

    @Override
    public List<PoolSearchView> search(FilteredSearchQuery query) throws Exception {
        SearchResponse<PoolSearchDocument> response = client.search(requests.create(query), PoolSearchDocument.class);
        return response.hits().hits().stream().map(hit -> mapper.toView(hit.source())).toList();
    }
}
