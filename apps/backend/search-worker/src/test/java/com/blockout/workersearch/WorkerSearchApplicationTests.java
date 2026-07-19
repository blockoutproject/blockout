package com.blockout.workersearch;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.blockout.workersearch.config.Auth0TokenManager;
import com.blockout.workersearch.services.caches.CacheInitializerService;
import com.blockout.workersearch.services.index.IndexInitializerService;
import com.blockout.workersearch.services.jobs.ClubCacheJob;
import com.blockout.workersearch.services.jobs.ConfigCacheJob;
import com.blockout.workersearch.services.jobs.IndexerJob;
import com.blockout.workersearch.services.jobs.TeamCacheJob;

@SpringBootTest(properties = {
        "spring.rabbitmq.dynamic=false",
        "spring.rabbitmq.listener.direct.auto-startup=false",
        "spring.rabbitmq.listener.simple.auto-startup=false"
})
class WorkerSearchApplicationTests {

    @MockitoBean
    Auth0TokenManager auth0TokenManager;

    @MockitoBean
    CacheInitializerService cacheInitializerService;

    @MockitoBean
    IndexInitializerService indexInitializerService;

    @MockitoBean
    ClubCacheJob clubCacheJob;

    @MockitoBean
    ConfigCacheJob configCacheJob;

    @MockitoBean
    IndexerJob indexerJob;

    @MockitoBean
    TeamCacheJob teamCacheJob;

    @Test
    void contextLoads() {
    }

}
