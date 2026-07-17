package com.blockout.mobilegateway.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {

        CaffeineCache divisionsCache = new CaffeineCache(
                "divisions",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofDays(1))
                        .build());

        CaffeineCache divisionByIdCache = new CaffeineCache(
                "divisionById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofDays(1))
                        .maximumSize(1000)
                        .build());

        CaffeineCache teamByIdCache = new CaffeineCache(
                "teamById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache teamsByClubIdCache = new CaffeineCache(
                "teamsByClubId",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache poolByIdCache = new CaffeineCache(
                "poolById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache clubByIdCache = new CaffeineCache(
                "clubById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache clubLogoByIdCache = new CaffeineCache(
                "clubLogoById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache mobileV2DivisionsCache = new CaffeineCache(
                "mobileV2Divisions",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofDays(1))
                        .build());

        CaffeineCache mobileV2DivisionByIdCache = new CaffeineCache(
                "mobileV2DivisionById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofDays(1))
                        .maximumSize(1000)
                        .build());

        CaffeineCache mobileV2TeamByIdCache = new CaffeineCache(
                "mobileV2TeamById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache mobileV2TeamsByClubIdCache = new CaffeineCache(
                "mobileV2TeamsByClubId",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache mobileV2PoolByIdCache = new CaffeineCache(
                "mobileV2PoolById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        CaffeineCache mobileV2ClubByIdCache = new CaffeineCache(
                "mobileV2ClubById",
                Caffeine.newBuilder()
                        .expireAfterWrite(Duration.ofHours(4))
                        .maximumSize(1000)
                        .build());

        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(java.util.Arrays.asList(
                divisionsCache,
                divisionByIdCache,
                teamByIdCache,
                poolByIdCache,
                teamsByClubIdCache,
                clubByIdCache,
                clubLogoByIdCache,
                mobileV2DivisionsCache,
                mobileV2DivisionByIdCache,
                mobileV2TeamByIdCache,
                mobileV2TeamsByClubIdCache,
                mobileV2PoolByIdCache,
                mobileV2ClubByIdCache));

        return manager;
    }
}
