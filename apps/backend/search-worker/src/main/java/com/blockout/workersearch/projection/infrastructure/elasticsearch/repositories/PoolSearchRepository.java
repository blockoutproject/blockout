package com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories;

import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.PoolSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface PoolSearchRepository extends ElasticsearchRepository<PoolSearchDocument, Long> {
}
