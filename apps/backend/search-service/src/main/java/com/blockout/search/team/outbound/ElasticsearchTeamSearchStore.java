package com.blockout.search.team.outbound;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.team.application.TeamSearchStore;
import com.blockout.search.team.application.TeamSearchView;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Executes team searches and maps adapter-local documents in Elasticsearch hit order. */
@Component
@RequiredArgsConstructor
public class ElasticsearchTeamSearchStore implements TeamSearchStore {

    private final ElasticsearchClient client;
    private final ElasticsearchTeamSearchRequestFactory requests;
    private final TeamSearchDocumentMapper mapper;

    @Override
    public List<TeamSearchView> search(FilteredSearchQuery query) throws Exception {
        SearchResponse<TeamSearchDocument> response = client.search(requests.create(query), TeamSearchDocument.class);
        return response.hits().hits().stream().map(hit -> mapper.toView(hit.source())).toList();
    }
}
