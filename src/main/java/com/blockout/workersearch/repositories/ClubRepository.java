package com.blockout.workersearch.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.workersearch.models.docs.ClubDoc;

public interface ClubRepository extends ElasticsearchRepository<ClubDoc, String> {}