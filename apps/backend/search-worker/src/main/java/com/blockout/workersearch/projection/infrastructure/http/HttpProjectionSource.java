package com.blockout.workersearch.projection.infrastructure.http;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.PoolProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.application.ports.ProjectionSource;
import com.blockout.workersearch.projection.infrastructure.http.contract.models.ClubInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.config.models.DivisionInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.pool.models.PoolInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.team.models.TeamInternalResponse;
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
                team.getId(), team.getName(), team.getShortName(), team.getClubId(), team.getDivisionId(),
                com.blockout.workersearch.projection.application.models.Format.valueOf(team.getFormat().name()),
                com.blockout.workersearch.projection.application.models.Gender.valueOf(team.getGender().name()),
                team.getSeason(), team.getLogoUrl()))
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
                pool.getId(), pool.getName(), pool.getShortName(), pool.getDivisionId(), pool.getLeagueCode(),
                pool.getLeagueName(), pool.getSeason(),
                com.blockout.workersearch.projection.application.models.Format.valueOf(pool.getFormat().name()),
                com.blockout.workersearch.projection.application.models.Gender.valueOf(pool.getGender().name())))
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
                division.getId(), division.getName(), division.getLogoUrl()))
            .toList();
    }

    private String activeUrl(String baseUrl) {
        return UriComponentsBuilder.fromUriString(baseUrl)
            .queryParam("active", true)
            .build()
            .toUriString();
    }
}
