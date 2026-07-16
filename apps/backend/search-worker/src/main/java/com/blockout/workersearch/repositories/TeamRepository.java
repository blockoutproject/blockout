package com.blockout.workersearch.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.workersearch.models.docs.TeamDoc;

public interface TeamRepository extends ElasticsearchRepository<TeamDoc, Long> {}