package com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories;

import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.TeamSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface TeamSearchRepository extends ElasticsearchRepository<TeamSearchDocument, Long> {}
