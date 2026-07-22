package com.blockout.mobilegateway.competition.infrastructure.competition;

import com.blockout.mobilegateway.competition.application.views.CompetitionAssociationView;
import com.blockout.mobilegateway.competition.application.views.PoolRankingView;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Reads Competition projections and maps generated transport models at the adapter boundary. */
@Service
@RequiredArgsConstructor
public class CompetitionInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final CompetitionContractMapper mapper;

    /** Returns the configured Competition API base URL. */
    private String baseUrl() {
        return apiClientProperties.getCompetition().getUrl();
    }

    /**
     * Reads association statistics for a team.
     *
     * @param teamId team identifier.
     * @return application-owned association views.
     */
    public List<CompetitionAssociationView> getAssociationsByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("teams", teamId.toString(), "pools")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toView).toList();
    }

    /**
     * Reads association statistics for a pool.
     *
     * @param poolId pool identifier.
     * @return application-owned association views.
     */
    public List<CompetitionAssociationView> getAssociationsByPool(Long poolId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("pools", poolId.toString(), "teams")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toView).toList();
    }

    /**
     * Reads every pool ranking containing a team.
     *
     * @param teamId team identifier.
     * @return application-owned pool ranking views.
     */
    public List<PoolRankingView> getPoolsWithRankingByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("teams", teamId.toString(), "pools-with-ranking")
            .build().toUriString();

        var response = internalApiClient.get(url, com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.PoolWithRankingInternalResponse[].class);
        return Optional.ofNullable(response.getBody()).stream().flatMap(Arrays::stream).map(mapper::toView).toList();
    }
}
