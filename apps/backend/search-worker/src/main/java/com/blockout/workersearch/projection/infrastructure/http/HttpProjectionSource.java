package com.blockout.workersearch.projection.infrastructure.http;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.PoolProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.application.ports.ProjectionSource;
import com.blockout.workersearch.projection.infrastructure.http.contract.models.ClubInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.models.DivisionInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.models.PoolInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.models.TeamInternalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class HttpProjectionSource implements ProjectionSource {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    @Override
    public List<ClubProjectionSource> listActiveClubs() {
        String url = activeUrl(apiClientProperties.getClub().getUrl());
        ClubInternalResponse[] body = internalApiClient.get(url, ClubInternalResponse[].class).getBody();
        return body == null
            ? Collections.emptyList()
            : Arrays.stream(body)
            .map(club -> new ClubProjectionSource(
                club.getId(), club.getName(), club.getLogoUrl(), club.getCity()))
            .toList();
    }

    @Override
    public List<TeamProjectionSource> listActiveTeams() {
        String url = activeUrl(apiClientProperties.getTeam().getUrl());
        TeamInternalResponse[] body = internalApiClient.get(url, TeamInternalResponse[].class).getBody();
        return body == null
            ? Collections.emptyList()
            : Arrays.stream(body)
            .map(team -> new TeamProjectionSource(
                team.id(), team.name(), team.shortName(), team.clubId(), team.divisionId(),
                team.format(), team.gender(), team.season(), team.logoUrl()))
            .toList();
    }

    @Override
    public List<PoolProjectionSource> listActivePools() {
        String url = activeUrl(apiClientProperties.getPool().getUrl());
        PoolInternalResponse[] body = internalApiClient.get(url, PoolInternalResponse[].class).getBody();
        return body == null
            ? Collections.emptyList()
            : Arrays.stream(body)
            .map(pool -> new PoolProjectionSource(
                pool.id(), pool.name(), pool.shortName(), pool.divisionId(), pool.leagueCode(),
                pool.leagueName(), pool.season(), pool.format(), pool.gender()))
            .toList();
    }

    @Override
    public List<DivisionProjectionSource> listDivisions() {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions";
        DivisionInternalResponse[] body = internalApiClient.get(url, DivisionInternalResponse[].class).getBody();
        return body == null
            ? Collections.emptyList()
            : Arrays.stream(body)
            .map(division -> new DivisionProjectionSource(
                division.id(), division.name(), division.logoUrl()))
            .toList();
    }

    private String activeUrl(String baseUrl) {
        return UriComponentsBuilder.fromUriString(baseUrl)
            .queryParam("active", true)
            .build()
            .toUriString();
    }
}
