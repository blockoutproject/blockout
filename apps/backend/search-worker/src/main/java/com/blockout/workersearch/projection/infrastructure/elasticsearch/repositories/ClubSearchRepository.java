package com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories;

import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.ClubSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface ClubSearchRepository extends ElasticsearchRepository<ClubSearchDocument, String> {}
