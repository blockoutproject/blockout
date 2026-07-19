package com.blockout.mobilegateway.competition.infrastructure.competition;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.PoolWithRankingInternalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CompetitionInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    private String baseUrl() {
        return apiClientProperties.getCompetition().getUrl();
    }

    public List<CompetitionAssociationInternalResponse> getAssociationsByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams", teamId.toString(), "pools")
                .build().toUriString();

        ResponseEntity<CompetitionAssociationInternalResponse[]> response = internalApiClient.get(url, CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }

    public List<CompetitionAssociationInternalResponse> getAssociationsByPool(Long poolId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("pools", poolId.toString(), "teams")
                .build().toUriString();

        ResponseEntity<CompetitionAssociationInternalResponse[]> response = internalApiClient.get(url, CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }

    public List<PoolWithRankingInternalResponse> getPoolsWithRankingByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams", teamId.toString(), "pools-with-ranking")
                .build().toUriString();

        ResponseEntity<PoolWithRankingInternalResponse[]> response = internalApiClient.get(url, PoolWithRankingInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }
}
