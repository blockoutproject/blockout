package com.blockout.workersearch;

import com.blockout.workersearch.projection.infrastructure.elasticsearch.ElasticsearchIndexInitializer;
import com.blockout.workersearch.projection.infrastructure.http.auth.Auth0ServiceTokenProvider;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionCacheInitializer;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionCacheScheduler;
import com.blockout.workersearch.projection.infrastructure.scheduling.ProjectionIndexScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "spring.rabbitmq.dynamic=false",
    "spring.rabbitmq.listener.direct.auto-startup=false",
    "spring.rabbitmq.listener.simple.auto-startup=false"
})
class WorkerSearchApplicationTests {

    @MockitoBean
    Auth0ServiceTokenProvider auth0ServiceTokenProvider;

    @MockitoBean
    ProjectionCacheInitializer projectionCacheInitializer;

    @MockitoBean
    ElasticsearchIndexInitializer elasticsearchIndexInitializer;

    @MockitoBean
    ProjectionCacheScheduler projectionCacheScheduler;

    @MockitoBean
    ProjectionIndexScheduler projectionIndexScheduler;

    @Test
    void contextLoads() {
    }

}
