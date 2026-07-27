package com.blockout.workersearch;

import com.blockout.workersearch.projection.infrastructure.elasticsearch.ElasticsearchIndexInitializer;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.ClubSearchRepository;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.PoolSearchRepository;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.TeamSearchRepository;
import com.blockout.workersearch.projection.infrastructure.http.auth.Auth0ServiceTokenProvider;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionCacheInitializer;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionCacheScheduler;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionIndexScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(
    properties = {
      "api.club.url=http://127.0.0.1:1",
      "api.team.url=http://127.0.0.1:1",
      "api.pool.url=http://127.0.0.1:1",
      "api.config.url=http://127.0.0.1:1",
      "auth0.domain=example.invalid",
      "auth0.client-id=unused",
      "auth0.client-secret=unused",
      "auth0.audience=unused",
      "auth0.token-refresh-delay=48h",
      "elasticsearch.host=127.0.0.1:1",
      "elasticsearch.username=unused",
      "elasticsearch.password=unused",
      "spring.rabbitmq.host=127.0.0.1",
      "spring.rabbitmq.port=1",
      "spring.rabbitmq.username=unused",
      "spring.rabbitmq.password=unused",
      "spring.rabbitmq.dynamic=false",
      "spring.rabbitmq.listener.direct.auto-startup=false",
      "spring.rabbitmq.listener.simple.auto-startup=false"
    })
class WorkerSearchApplicationSmokeTest {

  @MockitoBean Auth0ServiceTokenProvider auth0ServiceTokenProvider;

  @MockitoBean ProjectionCacheInitializer projectionCacheInitializer;

  @MockitoBean ElasticsearchIndexInitializer elasticsearchIndexInitializer;

  @MockitoBean ClubSearchRepository clubSearchRepository;

  @MockitoBean TeamSearchRepository teamSearchRepository;

  @MockitoBean PoolSearchRepository poolSearchRepository;

  @MockitoBean ProjectionCacheScheduler projectionCacheScheduler;

  @MockitoBean ProjectionIndexScheduler projectionIndexScheduler;

  @Test
  void contextLoads() {}
}
