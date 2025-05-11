package com.blockout.search.repositories;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import com.blockout.search.models.docs.ClubDoc;

public interface ClubRepository extends ElasticsearchRepository<ClubDoc, String> {}