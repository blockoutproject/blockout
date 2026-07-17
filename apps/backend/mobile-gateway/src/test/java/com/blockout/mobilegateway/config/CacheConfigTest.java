package com.blockout.mobilegateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.cache.support.SimpleCacheManager;

class CacheConfigTest {

    @Test
    void registersSeparateLegacyAndCanonicalCacheNamespaces() {
        var manager = (SimpleCacheManager) new CacheConfig().cacheManager();
        manager.afterPropertiesSet();

        assertThat(manager.getCacheNames()).containsAll(Set.of(
                "divisions",
                "divisionById",
                "teamById",
                "teamsByClubId",
                "poolById",
                "clubById",
                "mobileV2Divisions",
                "mobileV2DivisionById",
                "mobileV2TeamById",
                "mobileV2TeamsByClubId",
                "mobileV2PoolById",
                "mobileV2ClubById"));
        assertThat(manager.getCache("teamById")).isNotSameAs(manager.getCache("mobileV2TeamById"));
    }
}
