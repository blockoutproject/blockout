package com.blockout.search.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.search.models.docs.TeamDoc;

public interface TeamRepository extends ElasticsearchRepository<TeamDoc, Long> {}