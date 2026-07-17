package com.blockout.mobilegateway.club.outbound;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.club.application.MobileClubWorkflow;
import com.blockout.mobilegateway.clubsclient.api.ClubsClient;
import com.blockout.mobilegateway.clubsclient.model.ClubInternalResponse;
import com.blockout.mobilegateway.clubsclient.model.UpdateClubInternalRequest;
import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import com.blockout.mobilegateway.shared.outbound.TemporaryFilePart;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileClubGateway implements MobileClubGateway {

    private final ClubsClient userClient;
    private final ClubsClient m2mClient;

    public GeneratedMobileClubGateway(
            @Qualifier("clubsUserClient") ClubsClient userClient,
            @Qualifier("clubsM2mClient") ClubsClient m2mClient) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
    }

    @Override
    @Cacheable(value = "mobileV2ClubById", key = "#id", unless = "#result == null")
    public Snapshot find(String id) {
        ClubInternalResponse value = DownstreamClientSupport.nullableWhenNotFound(() -> client().getClub(id));
        return value == null ? null : snapshot(value);
    }

    @Override
    @Caching(
            put = @CachePut(value = "mobileV2ClubById", key = "#id"),
            evict = {
                    @CacheEvict(value = "clubById", key = "#id"),
                    @CacheEvict(value = "clubLogoById", key = "#id")
            })
    public Snapshot update(String id, MobileClubWorkflow.UpdateCommand command, BinaryPart image) {
        var request = new UpdateClubInternalRequest().name(command.name()).removeLogo(command.removeLogo());
        TemporaryFilePart temporary = TemporaryFilePart.create(image);
        try {
            return snapshot(userClient.updateClub(id, request, temporary == null ? null : temporary.file()));
        } finally {
            if (temporary != null) {
                temporary.close();
            }
        }
    }

    private ClubsClient client() {
        return DownstreamClientSupport.hasUserJwt() ? userClient : m2mClient;
    }

    private Snapshot snapshot(ClubInternalResponse value) {
        return new Snapshot(value.getId(), value.getRawName(), value.getName(), value.getAddress(), value.getCity(),
                value.getEmail(), value.getWebsite(), value.getLogoUrl(), value.getLatitude(), value.getLongitude());
    }
}
