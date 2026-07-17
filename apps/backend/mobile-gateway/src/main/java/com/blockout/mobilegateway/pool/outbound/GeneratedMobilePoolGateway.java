package com.blockout.mobilegateway.pool.outbound;

import com.blockout.mobilegateway.pool.application.MobilePoolGateway;
import com.blockout.mobilegateway.pool.application.MobilePoolWorkflow;
import com.blockout.mobilegateway.poolsclient.api.PoolsClient;
import com.blockout.mobilegateway.poolsclient.model.PoolInternalResponse;
import com.blockout.mobilegateway.poolsclient.model.UpdatePoolInternalRequest;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobilePoolGateway implements MobilePoolGateway {

    private final PoolsClient userClient;
    private final PoolsClient m2mClient;

    public GeneratedMobilePoolGateway(
            @Qualifier("poolsUserClient") PoolsClient userClient,
            @Qualifier("poolsM2mClient") PoolsClient m2mClient) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
    }

    @Override
    @Cacheable(value = "mobileV2PoolById", key = "#id", unless = "#result == null")
    public Snapshot find(Long id) {
        PoolInternalResponse value = DownstreamClientSupport.nullableWhenNotFound(() -> client().getPool(id));
        return value == null ? null : snapshot(value);
    }

    @Override
    @Caching(
            put = @CachePut(value = "mobileV2PoolById", key = "#id"),
            evict = @CacheEvict(value = "poolById", key = "#id"))
    public Snapshot update(Long id, MobilePoolWorkflow.UpdateCommand command) {
        var request = new UpdatePoolInternalRequest().name(command.name()).shortName(command.shortName());
        return snapshot(userClient.updatePool(id, request));
    }

    private PoolsClient client() {
        return DownstreamClientSupport.hasUserJwt() ? userClient : m2mClient;
    }

    private Snapshot snapshot(PoolInternalResponse value) {
        return new Snapshot(value.getId(), value.getPoolCode(), value.getLeagueCode(), value.getSeason(),
                value.getLeagueName(), value.getRawName(), value.getName(), value.getShortName(), value.getDivisionId(),
                value.getFormat(), value.getGender(), value.getFollowersCount(), Boolean.TRUE.equals(value.getActive()));
    }
}
