package com.blockout.search.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.search.models.docs.PoolDoc;

public interface PoolRepository extends ElasticsearchRepository<PoolDoc, Long> {}