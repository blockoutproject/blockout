package com.blockout.mobilegateway.team.outbound;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import com.blockout.mobilegateway.shared.outbound.TemporaryFilePart;
import com.blockout.mobilegateway.team.application.MobileTeamGateway;
import com.blockout.mobilegateway.team.application.MobileTeamWorkflow;
import com.blockout.mobilegateway.teamsclient.api.TeamsClient;
import com.blockout.mobilegateway.teamsclient.model.TeamInternalResponse;
import com.blockout.mobilegateway.teamsclient.model.UpdateTeamInternalRequest;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileTeamGateway implements MobileTeamGateway {

    private static final int PAGE_SIZE = 100;
    private final TeamsClient userClient;
    private final TeamsClient m2mClient;

    public GeneratedMobileTeamGateway(
            @Qualifier("teamsUserClient") TeamsClient userClient,
            @Qualifier("teamsM2mClient") TeamsClient m2mClient) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
    }

    @Override
    @Cacheable(value = "mobileV2TeamById", key = "#id", unless = "#result == null")
    public Snapshot find(Long id) {
        TeamInternalResponse value = DownstreamClientSupport.nullableWhenNotFound(() -> client().getTeam(id));
        return value == null ? null : snapshot(value);
    }

    @Override
    @Cacheable(value = "mobileV2TeamsByClubId", key = "#clubId")
    public List<Snapshot> listActiveByClub(String clubId) {
        List<Snapshot> result = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            var response = client().listTeams(null, null, null, null, clubId, null, true, page, PAGE_SIZE);
            response.getItems().stream().map(this::snapshot).forEach(result::add);
            hasNext = Boolean.TRUE.equals(response.getPageInfo().getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(result);
    }

    @Override
    @Caching(
            put = @CachePut(value = "mobileV2TeamById", key = "#id"),
            evict = {
                    @CacheEvict(value = "teamById", key = "#id"),
                    @CacheEvict(value = "teamsByClubId", key = "#result.clubId", condition = "#result != null"),
                    @CacheEvict(value = "mobileV2TeamsByClubId", key = "#result.clubId", condition = "#result != null")
            })
    public Snapshot update(Long id, MobileTeamWorkflow.UpdateCommand command, BinaryPart image) {
        var request = new UpdateTeamInternalRequest()
                .name(command.name())
                .shortName(command.shortName())
                .removeLogo(command.removeLogo());
        TemporaryFilePart temporary = TemporaryFilePart.create(image);
        try {
            return snapshot(userClient.updateTeam(id, request, temporary == null ? null : temporary.file()));
        } finally {
            if (temporary != null) {
                temporary.close();
            }
        }
    }

    private TeamsClient client() {
        return DownstreamClientSupport.hasUserJwt() ? userClient : m2mClient;
    }

    private Snapshot snapshot(TeamInternalResponse value) {
        return new Snapshot(value.getId(), value.getClubId(), value.getRawName(), value.getName(), value.getShortName(),
                value.getLeagueCode(), value.getDivisionId(), value.getSeason(), value.getFormat(), value.getGender(),
                value.getFollowersCount(), value.getLogoUrl(), Boolean.TRUE.equals(value.getActive()));
    }
}
