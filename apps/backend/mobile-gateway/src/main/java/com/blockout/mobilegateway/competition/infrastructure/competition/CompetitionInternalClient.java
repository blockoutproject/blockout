package com.blockout.mobilegateway.competition.infrastructure.competition;

import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.PoolWithRankingInternalResponse;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CompetitionInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final CompetitionContractMapper mapper;

    private String baseUrl() {
        return apiClientProperties.getCompetition().getUrl();
    }

    public List<CompetitionAssociationInternalResponse> getAssociationsByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("teams", teamId.toString(), "pools")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toResponse).toList();
    }

    public List<CompetitionAssociationInternalResponse> getAssociationsByPool(Long poolId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("pools", poolId.toString(), "teams")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toResponse).toList();
    }

    public List<PoolWithRankingInternalResponse> getPoolsWithRankingByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("teams", teamId.toString(), "pools-with-ranking")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.PoolWithRankingInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toResponse).toList();
    }
}
