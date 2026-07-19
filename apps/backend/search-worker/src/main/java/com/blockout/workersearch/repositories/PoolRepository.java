package com.blockout.workersearch.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.workersearch.models.docs.PoolDoc;

public interface PoolRepository extends ElasticsearchRepository<PoolDoc, Long> {}